"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createHotel, updateHotel, deleteHotel, setHotelPassengers, type ActionState,
} from "./actions";
import {
  Button, Card, CardBody, EmptyState, Field, Input, Modal, SubmitButton, Textarea,
} from "@/components/ui";
import {
  AlertCircle, CalendarDays, Hotel, MapPin, Pencil, Phone, Plus, Trash2, Users,
} from "lucide-react";

export type HotelRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  notes: string;
  passengers: { id: string; name: string; roomNumber: string; roomType: string }[];
};

type PassengerOpt = { id: string; name: string; type: string };

function fmtD(v: string) {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

export function HotelsClient({
  tripId,
  hotels,
  passengers,
  canWrite,
}: {
  tripId: string;
  hotels: HotelRow[];
  passengers: PassengerOpt[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HotelRow | null>(null);
  const [managing, setManaging] = useState<HotelRow | null>(null);

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nova hospedagem
          </Button>
        </div>
      )}

      {hotels.length === 0 ? (
        <EmptyState
          icon={<Hotel className="h-10 w-10" />}
          title="Nenhuma hospedagem cadastrada"
          description="Cadastre hotéis e vincule passageiros com número de quarto para usar nos vouchers."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {hotels.map((h) => (
            <Card key={h.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{h.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {[h.address, h.city, h.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {h.phone && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3.5 w-3.5" /> {h.phone}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Check-in {fmtD(h.checkIn)} · Check-out {fmtD(h.checkOut)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setManaging(h)}>
                      <Users className="h-3.5 w-3.5" /> {h.passengers.length}
                    </Button>
                    {canWrite && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(h)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <form action={deleteHotel.bind(null, tripId, h.id)}>
                          <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
                {h.notes && <p className="mt-2 text-xs text-slate-500">{h.notes}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <HotelModal
          tripId={tripId}
          hotel={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {managing && (
        <HotelPassengersModal
          tripId={tripId}
          hotel={managing}
          passengers={passengers}
          canWrite={canWrite}
          onClose={() => setManaging(null)}
        />
      )}
    </>
  );
}

function HotelModal({
  tripId,
  hotel,
  onClose,
}: {
  tripId: string;
  hotel?: HotelRow;
  onClose: () => void;
}) {
  const action = hotel
    ? updateHotel.bind(null, tripId, hotel.id)
    : createHotel.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={hotel ? `Editar ${hotel.name}` : "Nova hospedagem"} wide>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do hotel *" className="sm:col-span-2">
            <Input name="name" required defaultValue={hotel?.name} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <Input name="address" defaultValue={hotel?.address} />
          </Field>
          <Field label="Cidade">
            <Input name="city" defaultValue={hotel?.city} />
          </Field>
          <Field label="País">
            <Input name="country" defaultValue={hotel?.country} />
          </Field>
          <Field label="Telefone">
            <Input name="phone" defaultValue={hotel?.phone} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Check-in">
              <Input name="checkIn" type="date" defaultValue={hotel?.checkIn} />
            </Field>
            <Field label="Check-out">
              <Input name="checkOut" type="date" defaultValue={hotel?.checkOut} />
            </Field>
          </div>
        </div>
        <Field label="Observações (regime, café, taxas…)">
          <Textarea name="notes" defaultValue={hotel?.notes} />
        </Field>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>{hotel ? "Salvar" : "Cadastrar"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function HotelPassengersModal({
  tripId,
  hotel,
  passengers,
  canWrite,
  onClose,
}: {
  tripId: string;
  hotel: HotelRow;
  passengers: PassengerOpt[];
  canWrite: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const linked = useMemo(
    () => new Map(hotel.passengers.map((p) => [p.id, p])),
    [hotel]
  );
  const filtered = useMemo(
    () => passengers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [passengers, query]
  );
  const action = setHotelPassengers.bind(null, tripId, hotel.id);

  return (
    <Modal open onClose={onClose} title={`Hóspedes — ${hotel.name}`} wide>
      <form
        action={async (fd) => {
          await action(fd);
          onClose();
        }}
      >
        <Input
          placeholder="Filtrar passageiros…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {filtered.map((p) => {
            const link = linked.get(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    name={`p_${p.id}`}
                    defaultChecked={!!link}
                    disabled={!canWrite}
                  />
                  {p.name}
                </label>
                <Input
                  name={`room_${p.id}`}
                  defaultValue={link?.roomNumber ?? ""}
                  placeholder="Quarto"
                  className="w-20 !py-1 text-xs"
                  disabled={!canWrite}
                />
                <Input
                  name={`type_${p.id}`}
                  defaultValue={link?.roomType ?? ""}
                  placeholder="Tipo (DBL, SGL…)"
                  className="w-28 !py-1 text-xs"
                  disabled={!canWrite}
                />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-3 text-center text-xs text-slate-400">
              Nenhum passageiro encontrado.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          {canWrite && <SubmitButton>Salvar vínculos</SubmitButton>}
        </div>
      </form>
    </Modal>
  );
}
