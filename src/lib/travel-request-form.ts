import "server-only";
import type { Prisma } from "@prisma/client";
import { parseDateInput } from "./utils";

// ---------------------------------------------------------------------------
// Leitura e validação do formulário da linha direta.
// Compartilhado pela criação (/app/linha-direta) e pela edição
// (/app/solicitacoes/[id]/editar) — as duas telas usam o mesmo formulário,
// então as regras precisam viver em um lugar só.
// ---------------------------------------------------------------------------

export type SegmentInput = {
  sortOrder: number;
  origin: string;
  destination: string;
  date: Date | null;
  timePreference: string;
  notes: string;
};

export type PassengerInput = {
  sortOrder: number;
  name: string;
  type: string;
  birthDate: Date | null;
  docType: string;
  docNumber: string;
  docExpiry: Date | null;
  nationality: string;
  email: string;
  phone: string;
  loyalty: string;
  notes: string;
};

/**
 * As listas dinâmicas chegam como campos indexados (`seg_origin_0`, …). Os
 * índices podem ter buracos quando o associado remove linhas do meio, por isso
 * varremos as chaves em vez de contar sequencialmente.
 */
function indicesOf(formData: FormData, prefix: string): number[] {
  const found = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(new RegExp(`^${prefix}_[a-zA-Z]+_(\\d+)$`));
    if (match) found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

function readSegments(formData: FormData): SegmentInput[] {
  const get = (field: string, i: number) =>
    String(formData.get(`seg_${field}_${i}`) ?? "").trim();

  return indicesOf(formData, "seg")
    .map((i) => ({
      sortOrder: 0,
      origin: get("origin", i),
      destination: get("destination", i),
      date: parseDateInput(get("date", i)),
      timePreference: get("timePreference", i) || "QUALQUER",
      notes: get("notes", i),
    }))
    // Linhas totalmente vazias são descartadas em silêncio.
    .filter((s) => s.origin || s.destination || s.date)
    .map((s, position) => ({ ...s, sortOrder: position }));
}

function readPassengers(formData: FormData): PassengerInput[] {
  const get = (field: string, i: number) =>
    String(formData.get(`pax_${field}_${i}`) ?? "").trim();

  return indicesOf(formData, "pax")
    .map((i) => ({
      sortOrder: 0,
      name: get("name", i),
      type: get("type", i) || "TITULAR",
      birthDate: parseDateInput(get("birthDate", i)),
      docType: get("docType", i) || "PASSAPORTE",
      docNumber: get("docNumber", i),
      docExpiry: parseDateInput(get("docExpiry", i)),
      nationality: get("nationality", i),
      email: get("email", i),
      phone: get("phone", i),
      loyalty: get("loyalty", i),
      notes: get("notes", i),
    }))
    .filter((p) => p.name)
    .map((p, position) => ({ ...p, sortOrder: position }));
}

/** Tipo do pedido, deduzido dos serviços marcados — evita pedir de novo. */
function deriveKind(flags: {
  flight: boolean;
  hotel: boolean;
  eventTicket: boolean;
}) {
  if (flags.flight && flags.hotel) return "PACOTE";
  if (flags.eventTicket) return "EVENTO";
  if (flags.hotel) return "HOTEL";
  if (flags.flight) return "AEREO";
  return "OUTRO";
}

type SessionLike = { name: string; email: string; companyName: string };

/** Campos escalares da solicitação — servem tanto para criar quanto editar. */
export type RequestScalarData = Omit<
  Prisma.TravelRequestUncheckedCreateInput,
  | "id"
  | "associateId"
  | "segments"
  | "passengers"
  | "status"
  | "handledBy"
  | "dispatchLog"
  | "copyLog"
  | "createdAt"
  | "updatedAt"
  | "editedAt"
>;

export type ParsedRequestForm =
  | { error: string }
  | {
      data: RequestScalarData;
      segments: SegmentInput[];
      passengers: PassengerInput[];
    };

export function readRequestForm(
  formData: FormData,
  session: SessionLike
): ParsedRequestForm {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const bool = (k: string) => formData.get(k) === "on";

  const segments = readSegments(formData);
  const passengers = readPassengers(formData);
  const purpose = get("purpose");

  const needsFlight = bool("needsFlight");
  const needsHotel = bool("needsHotel");
  const needsEventTicket = bool("needsEventTicket");

  // Validação: o mínimo para um atendente conseguir trabalhar.
  if (segments.length === 0) {
    return { error: "Informe ao menos um trecho da viagem." };
  }
  const incomplete = segments.find((s) => !s.origin || !s.destination);
  if (incomplete) {
    return { error: `Preencha origem e destino do trecho ${incomplete.sortOrder + 1}.` };
  }
  if (passengers.length === 0) {
    return { error: "Informe ao menos um passageiro." };
  }
  if (!purpose) {
    return { error: "Descreva brevemente o motivo da viagem." };
  }

  const algumServico =
    needsFlight ||
    needsHotel ||
    needsEventTicket ||
    bool("needsTransfer") ||
    bool("needsCarRental") ||
    bool("needsChauffeur") ||
    bool("needsInsurance") ||
    bool("needsCurrency") ||
    bool("needsVisa") ||
    bool("needsConnectivity");
  if (!algumServico) {
    return { error: "Selecione ao menos um serviço para a solicitação." };
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const tripType =
    segments.length > 2 ? "MULTITRECHO" : segments.length === 2 ? "IDA_VOLTA" : "SO_IDA";

  return {
    segments,
    passengers,
    data: {
      requesterName: get("requesterName") || session.name,
      requesterEmail: get("requesterEmail") || session.email,
      requesterPhone: get("requesterPhone"),
      companyName: get("companyName") || session.companyName,

      // Resumo denormalizado, para a fila do staff e a home do associado.
      kind: deriveKind({
        flight: needsFlight,
        hotel: needsHotel,
        eventTicket: needsEventTicket,
      }),
      origin: first.origin,
      destination: tripType === "SO_IDA" ? last.destination : first.destination,
      departDate: first.date,
      returnDate: segments.length > 1 ? last.date : null,
      tripType,

      flexibleDates: bool("flexibleDates"),
      pax: passengers.length,
      budget: get("budget"),
      purpose,
      notes: get("notes"),
      sendCopy: bool("sendCopy"),

      needsFlight,
      cabinClass: get("cabinClass") || "ECONOMICA",
      preferredAirline: get("preferredAirline"),
      checkedBaggage: bool("checkedBaggage"),
      seatPreference: get("seatPreference") || "INDIFERENTE",
      loyaltyProgram: get("loyaltyProgram"),

      needsHotel,
      hotelCity: get("hotelCity"),
      hotelCheckIn: parseDateInput(get("hotelCheckIn")),
      hotelCheckOut: parseDateInput(get("hotelCheckOut")),
      hotelCategory: get("hotelCategory") || "INDIFERENTE",
      hotelRooms: Math.max(1, Number(get("hotelRooms") || 1)),
      hotelRoomType: get("hotelRoomType") || "SINGLE",
      hotelChain: get("hotelChain"),
      hotelBreakfast: bool("hotelBreakfast"),
      hotelReference: get("hotelReference"),

      needsTransfer: bool("needsTransfer"),
      needsCarRental: bool("needsCarRental"),
      carCategory: get("carCategory"),
      carPickup: get("carPickup"),
      carDropoff: get("carDropoff"),
      carExtraDriver: bool("carExtraDriver"),
      needsChauffeur: bool("needsChauffeur"),
      transferNotes: get("transferNotes"),

      needsInsurance: bool("needsInsurance"),
      needsCurrency: bool("needsCurrency"),
      currencyNotes: get("currencyNotes"),
      needsVisa: bool("needsVisa"),
      visaNotes: get("visaNotes"),
      needsConnectivity: bool("needsConnectivity"),
      needsEventTicket,
      eventName: get("eventName"),
    },
  };
}
