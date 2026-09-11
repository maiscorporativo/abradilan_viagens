"use client";

import { Badge } from "@/components/ui";
import {
  TRIP_TYPES, TIME_PREFERENCES, CABIN_CLASSES, SEAT_PREFERENCES,
  HOTEL_CATEGORIES, ROOM_TYPES, CAR_CATEGORIES, TRAVEL_PASSENGER_TYPES,
  TRAVEL_DOC_TYPES,
} from "@/lib/constants";
import { formatDateBR } from "@/lib/utils";
import { Plane, BedDouble, Car, LifeBuoy, Route, Users } from "lucide-react";

export type SegmentRow = {
  origin: string;
  destination: string;
  date: string | null;
  timePreference: string;
  notes: string;
};

export type PassengerRow = {
  id: string;
  name: string;
  type: string;
  birthDate: string | null;
  docType: string;
  docNumber: string;
  docExpiry: string | null;
  nationality: string;
  email: string;
  phone: string;
  loyalty: string;
  notes: string;
};

export type RequestDetailData = {
  tripType: string;
  flexibleDates: boolean;
  budget: string;
  purpose: string;
  notes: string;
  handledBy: string;
  dispatchLog: string;
  segments: SegmentRow[];
  passengers: PassengerRow[];

  needsFlight: boolean;
  cabinClass: string;
  preferredAirline: string;
  checkedBaggage: boolean;
  seatPreference: string;
  loyaltyProgram: string;

  needsHotel: boolean;
  hotelCity: string;
  hotelCheckIn: string | null;
  hotelCheckOut: string | null;
  hotelCategory: string;
  hotelRooms: number;
  hotelRoomType: string;
  hotelChain: string;
  hotelBreakfast: boolean;
  hotelReference: string;

  needsTransfer: boolean;
  needsCarRental: boolean;
  carCategory: string;
  carPickup: string;
  carDropoff: string;
  carExtraDriver: boolean;
  needsChauffeur: boolean;
  transferNotes: string;

  needsInsurance: boolean;
  needsCurrency: boolean;
  currencyNotes: string;
  needsVisa: boolean;
  visaNotes: string;
  needsConnectivity: boolean;
  needsEventTicket: boolean;
  eventName: string;
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      {children}
    </section>
  );
}

/** Par rótulo/valor; some quando o valor é vazio. */
function Item({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm text-slate-700">
      <span className="text-slate-400">{label}:</span> {value}
    </p>
  );
}

export function RequestDetail({ r }: { r: RequestDetailData }) {
  const apoio = [
    r.needsInsurance ? "Seguro viagem" : null,
    r.needsCurrency ? `Câmbio${r.currencyNotes ? ` — ${r.currencyNotes}` : ""}` : null,
    r.needsVisa ? `Visto/documentação${r.visaNotes ? ` — ${r.visaNotes}` : ""}` : null,
    r.needsConnectivity ? "Chip / internet internacional" : null,
    r.needsEventTicket
      ? `Ingresso de evento${r.eventName ? ` — ${r.eventName}` : ""}`
      : null,
  ].filter((v): v is string => v !== null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="teal">{TRIP_TYPES[r.tripType] ?? r.tripType}</Badge>
        {r.flexibleDates && <Badge tone="amber">datas flexíveis</Badge>}
        {r.budget && <Badge tone="slate">{r.budget}</Badge>}
      </div>

      {r.segments.length > 0 && (
        <Section icon={Route} title="Itinerário">
          <ol className="space-y-1.5">
            {r.segments.map((s, i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="font-semibold">
                  {i + 1}. {s.origin} → {s.destination}
                </span>
                {s.date && (
                  <span className="text-slate-500"> · {formatDateBR(s.date)}</span>
                )}
                {s.timePreference !== "QUALQUER" && (
                  <span className="text-slate-500">
                    {" "}
                    ({TIME_PREFERENCES[s.timePreference] ?? s.timePreference})
                  </span>
                )}
                {s.notes && (
                  <span className="block pl-4 text-xs text-slate-500">{s.notes}</span>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {r.passengers.length > 0 && (
        <Section icon={Users} title={`Passageiros (${r.passengers.length})`}>
          <ul className="space-y-3">
            {r.passengers.map((p) => (
              <li key={p.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">
                  {p.name}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    {TRAVEL_PASSENGER_TYPES[p.type] ?? p.type}
                  </span>
                </p>
                <Item
                  label={TRAVEL_DOC_TYPES[p.docType] ?? p.docType}
                  value={
                    p.docNumber
                      ? p.docNumber +
                        (p.docExpiry ? ` (val. ${formatDateBR(p.docExpiry)})` : "")
                      : null
                  }
                />
                <Item
                  label="Nascimento"
                  value={p.birthDate ? formatDateBR(p.birthDate) : null}
                />
                <Item label="Nacionalidade" value={p.nationality} />
                <Item label="Fidelidade" value={p.loyalty} />
                <Item
                  label="Contato"
                  value={[p.email, p.phone].filter(Boolean).join(" · ") || null}
                />
                <Item label="Obs." value={p.notes} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.needsFlight && (
        <Section icon={Plane} title="Aéreo">
          <Item label="Classe" value={CABIN_CLASSES[r.cabinClass] ?? r.cabinClass} />
          <Item label="Companhia preferida" value={r.preferredAirline} />
          <Item label="Bagagem despachada" value={r.checkedBaggage ? "sim" : "não"} />
          <Item
            label="Assento"
            value={
              r.seatPreference && r.seatPreference !== "INDIFERENTE"
                ? SEAT_PREFERENCES[r.seatPreference] ?? r.seatPreference
                : null
            }
          />
          <Item label="Fidelidade" value={r.loyaltyProgram} />
        </Section>
      )}

      {r.needsHotel && (
        <Section icon={BedDouble} title="Hospedagem">
          <Item label="Cidade" value={r.hotelCity} />
          <Item
            label="Período"
            value={
              r.hotelCheckIn
                ? formatDateBR(r.hotelCheckIn) +
                  (r.hotelCheckOut ? ` a ${formatDateBR(r.hotelCheckOut)}` : "")
                : null
            }
          />
          <Item
            label="Quartos"
            value={`${r.hotelRooms} · ${ROOM_TYPES[r.hotelRoomType] ?? r.hotelRoomType}`}
          />
          <Item
            label="Categoria"
            value={
              r.hotelCategory && r.hotelCategory !== "INDIFERENTE"
                ? HOTEL_CATEGORIES[r.hotelCategory] ?? r.hotelCategory
                : null
            }
          />
          <Item label="Rede preferida" value={r.hotelChain} />
          <Item label="Café da manhã" value={r.hotelBreakfast ? "sim" : "não"} />
          <Item label="Referência" value={r.hotelReference} />
        </Section>
      )}

      {(r.needsTransfer || r.needsCarRental || r.needsChauffeur) && (
        <Section icon={Car} title="Transporte terrestre">
          {r.needsTransfer && (
            <p className="text-sm text-slate-700">• Traslado aeroporto ↔ hotel</p>
          )}
          {r.needsChauffeur && (
            <p className="text-sm text-slate-700">• Motorista à disposição</p>
          )}
          {r.needsCarRental && (
            <p className="text-sm text-slate-700">
              • Aluguel de carro
              {r.carCategory
                ? ` — ${CAR_CATEGORIES[r.carCategory] ?? r.carCategory}`
                : ""}
            </p>
          )}
          <Item label="Retirada" value={r.needsCarRental ? r.carPickup : null} />
          <Item label="Devolução" value={r.needsCarRental ? r.carDropoff : null} />
          <Item
            label="Motorista adicional"
            value={r.needsCarRental && r.carExtraDriver ? "sim" : null}
          />
          <Item label="Obs." value={r.transferNotes} />
        </Section>
      )}

      {apoio.length > 0 && (
        <Section icon={LifeBuoy} title="Serviços de apoio">
          <ul className="space-y-1">
            {apoio.map((v) => (
              <li key={v} className="text-sm text-slate-700">
                • {v}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={Route} title="Contexto">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{r.purpose}</p>
        {r.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{r.notes}</p>
        )}
      </Section>

      {r.handledBy && (
        <p className="text-xs text-slate-400">Em atendimento por {r.handledBy}</p>
      )}
      {r.dispatchLog && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {r.dispatchLog}
        </p>
      )}
    </div>
  );
}
