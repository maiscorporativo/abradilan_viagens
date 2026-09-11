"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWriter, requireTripWriter } from "@/lib/auth";
import { parseDateTimeInput } from "@/lib/utils";
import { saveUpload, ALLOWED_UPLOAD_TYPES } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

/** Localizadores digitados no formulário, sem repetição e sem vazios. */
function locatorsFromForm(formData: FormData) {
  const codes = formData
    .getAll("locators")
    .map((v) => String(v).trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(codes)];
}

function flightFromForm(formData: FormData) {
  const flightNumber = String(formData.get("flightNumber") ?? "").trim().toUpperCase();
  return {
    scope: String(formData.get("scope") ?? "INTERNACIONAL"),
    flightNumber,
    airlineCode: String(formData.get("airlineCode") ?? "").trim().toUpperCase() ||
      flightNumber.slice(0, 2),
    airlineName: String(formData.get("airlineName") ?? "").trim(),
    operatedBy: String(formData.get("operatedBy") ?? "").trim(),
    originIata: String(formData.get("originIata") ?? "").trim().toUpperCase(),
    originName: String(formData.get("originName") ?? "").trim(),
    destIata: String(formData.get("destIata") ?? "").trim().toUpperCase(),
    destName: String(formData.get("destName") ?? "").trim(),
    depDateTime: parseDateTimeInput(String(formData.get("depDateTime") ?? "")),
    arrDateTime: parseDateTimeInput(String(formData.get("arrDateTime") ?? "")),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

/** Preenche nome da cia e dos aeroportos a partir dos catálogos globais. */
async function enrich(data: ReturnType<typeof flightFromForm>) {
  if (!data.airlineName && data.airlineCode) {
    const airline = await db.airline.findUnique({ where: { code: data.airlineCode } });
    if (airline) data.airlineName = airline.name;
  }
  if (!data.originName && data.originIata) {
    const a = await db.airport.findUnique({ where: { iata: data.originIata } });
    if (a) data.originName = [a.city || a.name, a.country].filter(Boolean).join(", ");
  }
  if (!data.destName && data.destIata) {
    const a = await db.airport.findUnique({ where: { iata: data.destIata } });
    if (a) data.destName = [a.city || a.name, a.country].filter(Boolean).join(", ");
  }
  return data;
}

export async function createFlight(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = flightFromForm(formData);
  if (!data.flightNumber || !data.originIata || !data.destIata) {
    return { error: "Número do voo, origem e destino são obrigatórios." };
  }
  const codes = locatorsFromForm(formData);
  await db.flight.create({
    data: {
      ...(await enrich(data)),
      tripId,
      locator: codes[0] ?? "",
      locators: { create: codes.map((code) => ({ code })) },
    },
  });
  revalidatePath(`/admin/t/${tripId}/flights`);
  return { ok: true };
}

export async function updateFlight(
  tripId: string,
  flightId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = flightFromForm(formData);
  if (!data.flightNumber || !data.originIata || !data.destIata) {
    return { error: "Número do voo, origem e destino são obrigatórios." };
  }

  // Sincroniza a lista de localizadores preservando os ids dos que continuam,
  // para não desfazer a alocação dos passageiros já vinculados a eles.
  const codes = locatorsFromForm(formData);
  const current = await db.flightLocator.findMany({ where: { flightId } });
  const removed = current.filter((l) => !codes.includes(l.code));
  const added = codes.filter((c) => !current.some((l) => l.code === c));

  if (removed.length) {
    await db.flightLocator.deleteMany({
      where: { id: { in: removed.map((l) => l.id) } },
    });
  }
  if (added.length) {
    await db.flightLocator.createMany({
      data: added.map((code) => ({ flightId, code })),
    });
  }

  await db.flight.update({
    where: { id: flightId },
    data: { ...(await enrich(data)), locator: codes[0] ?? "" },
  });
  revalidatePath(`/admin/t/${tripId}/flights`);
  return { ok: true };
}

export async function deleteFlight(tripId: string, flightId: string) {
  await requireTripWriter(tripId);
  await db.flight.delete({ where: { id: flightId } });
  revalidatePath(`/admin/t/${tripId}/flights`);
}

export type FlightPassengerRow = {
  passengerId: string;
  seat: string;
  locatorId: string | null; // localizador do passageiro dentro deste voo
};

/** Define quem viaja neste voo, com assento e localizador de cada passageiro. */
export async function setFlightPassengers(
  tripId: string,
  flightId: string,
  rows: FlightPassengerRow[]
) {
  await requireTripWriter(tripId);

  // Ignora localizadores que não pertencem a este voo
  const locators = await db.flightLocator.findMany({
    where: { flightId },
    select: { id: true },
  });
  const validLocators = new Set(locators.map((l) => l.id));

  const selected = new Map(
    rows.map((r) => [
      r.passengerId,
      {
        seat: r.seat.trim(),
        locatorId:
          r.locatorId && validLocators.has(r.locatorId) ? r.locatorId : null,
      },
    ])
  );

  const current = await db.flightPassenger.findMany({ where: { flightId } });
  const currentIds = new Set(current.map((c) => c.passengerId));

  const toRemove = [...currentIds].filter((id) => !selected.has(id));
  if (toRemove.length) {
    await db.flightPassenger.deleteMany({
      where: { flightId, passengerId: { in: toRemove } },
    });
  }
  for (const [passengerId, data] of selected) {
    if (currentIds.has(passengerId)) {
      await db.flightPassenger.update({
        where: { flightId_passengerId: { flightId, passengerId } },
        data,
      });
    } else {
      await db.flightPassenger.create({
        data: { flightId, passengerId, ...data },
      });
    }
  }
  revalidatePath(`/admin/t/${tripId}/flights`);
}

// ---------------- Catálogo global de cias aéreas ----------------
export async function upsertAirline(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireWriter();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || code.length > 3 || !name) {
    return { error: "Informe o código IATA (2 letras) e o nome da companhia." };
  }

  let logoPath: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_UPLOAD_TYPES.has(logo.type)) {
      return { error: "Logo deve ser PNG, JPG ou WEBP." };
    }
    const saved = await saveUpload(
      `airlines`,
      logo.name,
      Buffer.from(await logo.arrayBuffer())
    );
    logoPath = saved.filePath;
  }

  await db.airline.upsert({
    where: { code },
    update: { name, ...(logoPath ? { logoPath } : {}) },
    create: { code, name, logoPath: logoPath ?? "" },
  });
  revalidatePath("/admin/airlines");
  return { ok: true };
}

export async function deleteAirline(code: string) {
  await requireWriter();
  await db.airline.delete({ where: { code } });
  revalidatePath("/admin/airlines");
}

export async function upsertAirport(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireWriter();
  const iata = String(formData.get("iata") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!iata || iata.length !== 3 || !name) {
    return { error: "Informe a sigla IATA (3 letras) e o nome do aeroporto." };
  }
  await db.airport.upsert({
    where: { iata },
    update: {
      name,
      city: String(formData.get("city") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
    },
    create: {
      iata,
      name,
      city: String(formData.get("city") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
    },
  });
  revalidatePath("/admin/airlines");
  return { ok: true };
}

export async function deleteAirport(iata: string) {
  await requireWriter();
  await db.airport.delete({ where: { iata } });
  revalidatePath("/admin/airlines");
}
