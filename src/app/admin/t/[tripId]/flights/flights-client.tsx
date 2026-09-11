"use client";

import {
  useActionState, useEffect, useMemo, useState, useTransition,
} from "react";
import {
  createFlight, updateFlight, deleteFlight, setFlightPassengers,
  type ActionState,
} from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal, Select,
  SubmitButton, Textarea,
} from "@/components/ui";
import {
  AlertCircle, ArrowRight, Clock, Loader2, Pencil, Plane, PlaneLanding,
  PlaneTakeoff, Plus, Trash2, Users,
} from "lucide-react";

export type FlightLocatorRow = { id: string; code: string };

export type FlightRow = {
  id: string;
  scope: string;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  operatedBy: string;
  originIata: string;
  originName: string;
  destIata: string;
  destName: string;
  depDateTime: string;
  arrDateTime: string;
  notes: string;
  locators: FlightLocatorRow[];
  passengers: {
    id: string;
    name: string;
    seat: string;
    locatorId: string | null;
  }[];
};

type AirlineOpt = { code: string; name: string; hasLogo: boolean };
type AirportOpt = { iata: string; label: string };
type PassengerOpt = { id: string; name: string; type: string };

function fmtDT(v: string) {
  if (!v) return "—";
  const [date, time] = v.split("T");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time}`;
}

export function FlightsClient({
  tripId,
  flights,
  airlines,
  airports,
  passengers,
  canWrite,
}: {
  tripId: string;
  flights: FlightRow[];
  airlines: AirlineOpt[];
  airports: AirportOpt[];
  passengers: PassengerOpt[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FlightRow | null>(null);
  const [managing, setManaging] = useState<FlightRow | null>(null);

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo voo
          </Button>
        </div>
      )}

      {flights.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-10 w-10" />}
          title="Nenhum voo cadastrado"
          description="Cadastre os trechos aéreos da viagem para vinculá-los aos passageiros e imprimir nos vouchers."
        />
      ) : (
        <div className="space-y-3">
          {flights.map((f) => (
            <Card key={f.id}>
              <CardBody className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex w-40 items-center gap-3">
                    {f.airlineCode && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/airline-logo/${f.airlineCode}`}
                        alt=""
                        className="h-8 w-8 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <p className="font-mono text-base font-bold text-slate-900">
                        {f.flightNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {f.airlineName || f.airlineCode}
                      </p>
                      {f.operatedBy && (
                        <p className="text-[10px] font-semibold text-ember-600">
                          Operado por {f.operatedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{f.originIata}</p>
                      <p className="max-w-36 truncate text-[11px] text-slate-500">
                        {f.originName}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600">
                        <PlaneTakeoff className="h-3 w-3" /> {fmtDT(f.depDateTime)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ember-500" />
                    <div>
                      <p className="text-lg font-bold text-slate-900">{f.destIata}</p>
                      <p className="max-w-36 truncate text-[11px] text-slate-500">
                        {f.destName}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <PlaneLanding className="h-3 w-3" /> {fmtDT(f.arrDateTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={f.scope === "NACIONAL" ? "blue" : "violet"}>
                      {f.scope === "NACIONAL" ? "Nacional" : "Internacional"}
                    </Badge>
                    {f.locators.map((l) => (
                      <Badge key={l.id} tone="slate" className="font-mono">
                        LOC {l.code}
                        <span className="ml-1 font-sans text-[10px] text-slate-400">
                          {f.passengers.filter((p) => p.locatorId === l.id).length}
                        </span>
                      </Badge>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManaging(f)}
                      title="Passageiros deste voo"
                    >
                      <Users className="h-3.5 w-3.5" /> {f.passengers.length}
                    </Button>
                    {canWrite && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <form action={deleteFlight.bind(null, tripId, f.id)}>
                          <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
                {f.notes && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" /> {f.notes}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FlightModal
          tripId={tripId}
          flight={editing ?? undefined}
          airlines={airlines}
          airports={airports}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {managing && (
        <PassengersModal
          tripId={tripId}
          flight={managing}
          passengers={passengers}
          canWrite={canWrite}
          onClose={() => setManaging(null)}
        />
      )}
    </>
  );
}

function FlightModal({
  tripId,
  flight,
  airlines,
  airports,
  onClose,
}: {
  tripId: string;
  flight?: FlightRow;
  airlines: AirlineOpt[];
  airports: AirportOpt[];
  onClose: () => void;
}) {
  const action = flight
    ? updateFlight.bind(null, tripId, flight.id)
    : createFlight.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={flight ? `Editar voo ${flight.flightNumber}` : "Novo voo"} wide>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Número do voo *">
            <Input name="flightNumber" required defaultValue={flight?.flightNumber} placeholder="LA8065" />
          </Field>
          <Field label="Companhia aérea">
            <Select name="airlineCode" defaultValue={flight?.airlineCode ?? ""}>
              <option value="">Detectar pelo nº do voo</option>
              {airlines.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Âmbito">
            <Select name="scope" defaultValue={flight?.scope ?? "INTERNACIONAL"}>
              <option value="INTERNACIONAL">Internacional</option>
              <option value="NACIONAL">Nacional</option>
            </Select>
          </Field>
          <Field label="Origem (IATA) *">
            <Input name="originIata" required defaultValue={flight?.originIata} placeholder="GRU" list="airport-list" maxLength={3} />
          </Field>
          <Field label="Destino (IATA) *">
            <Input name="destIata" required defaultValue={flight?.destIata} placeholder="PMI" list="airport-list" maxLength={3} />
          </Field>
          <Field label="Operado por (se diferente da cia comercializadora)">
            <Input
              name="operatedBy"
              defaultValue={flight?.operatedBy}
              placeholder="Ex.: LATAM Airlines"
            />
          </Field>
          <Field label="Partida (data e hora local)">
            <Input name="depDateTime" type="datetime-local" defaultValue={flight?.depDateTime} />
          </Field>
          <Field label="Chegada (data e hora local)">
            <Input name="arrDateTime" type="datetime-local" defaultValue={flight?.arrDateTime} />
          </Field>
        </div>
        <datalist id="airport-list">
          {airports.map((a) => (
            <option key={a.iata} value={a.iata}>{a.label}</option>
          ))}
        </datalist>

        <LocatorsField initial={flight?.locators.map((l) => l.code) ?? []} />
        <Field label="Observações (bagagem, conexão, etc.)">
          <Textarea name="notes" defaultValue={flight?.notes} />
        </Field>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>{flight ? "Salvar" : "Cadastrar voo"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Lista editável de localizadores (PNR) do voo. Os inputs compartilham o nome
 * "locators" — o server action lê todos com formData.getAll.
 */
function LocatorsField({ initial }: { initial: string[] }) {
  const [codes, setCodes] = useState<string[]>(
    initial.length > 0 ? initial : [""]
  );

  const update = (i: number, v: string) =>
    setCodes((prev) => prev.map((c, idx) => (idx === i ? v : c)));

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Localizadores (PNR)
      </p>
      <p className="mb-3 mt-1 text-xs text-slate-500">
        Um mesmo voo pode ter vários localizadores. Cadastre todos aqui e, na
        tela de passageiros do voo, escolha a qual deles cada passageiro
        pertence.
      </p>
      <div className="space-y-2">
        {codes.map((code, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name="locators"
              value={code}
              onChange={(e) => update(i, e.target.value.toUpperCase())}
              placeholder="Ex.: QW2PPD"
              className="flex-1 font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600"
              title="Remover localizador"
              onClick={() =>
                setCodes((prev) =>
                  prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setCodes((prev) => [...prev, ""])}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar localizador
      </Button>
      <p className="mt-2 text-[11px] text-slate-400">
        Ao remover um localizador, os passageiros continuam no voo, mas ficam
        sem localizador até você atribuir outro.
      </p>
    </div>
  );
}

type Alloc = { checked: boolean; seat: string; locatorId: string | null };

function PassengersModal({
  tripId,
  flight,
  passengers,
  canWrite,
  onClose,
}: {
  tripId: string;
  flight: FlightRow;
  passengers: PassengerOpt[];
  canWrite: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [bulkLocator, setBulkLocator] = useState(flight.locators[0]?.id ?? "");
  const [saving, startSaving] = useTransition();

  const [alloc, setAlloc] = useState<Record<string, Alloc>>(() => {
    const linked = new Map(flight.passengers.map((p) => [p.id, p]));
    return Object.fromEntries(
      passengers.map((p) => {
        const l = linked.get(p.id);
        return [
          p.id,
          {
            checked: !!l,
            seat: l?.seat ?? "",
            locatorId: l?.locatorId ?? null,
          },
        ];
      })
    );
  });

  const patch = (id: string, data: Partial<Alloc>) =>
    setAlloc((prev) => ({ ...prev, [id]: { ...prev[id], ...data } }));

  const filtered = useMemo(
    () =>
      passengers.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [passengers, query]
  );

  const checkedCount = Object.values(alloc).filter((a) => a.checked).length;

  /** Aplica o localizador escolhido a todos os passageiros marcados. */
  const applyBulkLocator = () => {
    setAlloc((prev) => {
      const next = { ...prev };
      for (const [id, a] of Object.entries(next)) {
        if (a.checked) next[id] = { ...a, locatorId: bulkLocator || null };
      }
      return next;
    });
  };

  const save = () => {
    startSaving(async () => {
      await setFlightPassengers(
        tripId,
        flight.id,
        Object.entries(alloc)
          .filter(([, a]) => a.checked)
          .map(([passengerId, a]) => ({
            passengerId,
            seat: a.seat,
            locatorId: a.locatorId,
          }))
      );
      onClose();
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Passageiros do voo ${flight.flightNumber} (${flight.originIata} → ${flight.destIata})`}
      wide
    >
      {flight.locators.length === 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Este voo ainda não tem localizadores cadastrados. Edite o voo para
          adicioná-los e poder alocar os passageiros por LOC.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filtrar passageiros…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-48 flex-1"
        />
        {canWrite && flight.locators.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={bulkLocator}
              onChange={(e) => setBulkLocator(e.target.value)}
              className="w-40"
            >
              <option value="">Sem localizador</option>
              {flight.locators.map((l) => (
                <option key={l.id} value={l.id}>{l.code}</option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={applyBulkLocator}
              disabled={checkedCount === 0}
              title="Aplica este localizador a todos os passageiros marcados"
            >
              Aplicar aos {checkedCount} marcados
            </Button>
          </div>
        )}
      </div>

      <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {filtered.map((p) => {
          const a = alloc[p.id];
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={a.checked}
                  onChange={(e) => patch(p.id, { checked: e.target.checked })}
                  disabled={!canWrite}
                />
                {p.name}
                <span className="text-[10px] uppercase text-slate-400">
                  {p.type === "TITULAR" ? "Titular" : "Acomp."}
                </span>
              </label>
              {flight.locators.length > 0 && (
                <Select
                  value={a.locatorId ?? ""}
                  onChange={(e) =>
                    patch(p.id, { locatorId: e.target.value || null })
                  }
                  disabled={!canWrite || !a.checked}
                  className="w-32 !py-1 font-mono text-xs"
                  title="Localizador do passageiro neste voo"
                >
                  <option value="">Sem LOC</option>
                  {flight.locators.map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </Select>
              )}
              <Input
                value={a.seat}
                onChange={(e) => patch(p.id, { seat: e.target.value })}
                placeholder="Assento"
                className="w-24 !py-1 text-xs"
                disabled={!canWrite || !a.checked}
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {checkedCount} passageiro(s) neste voo
          {flight.locators.length > 0 &&
            ` · ${
              Object.values(alloc).filter((x) => x.checked && !x.locatorId).length
            } sem localizador`}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          {canWrite && (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar vínculos
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
