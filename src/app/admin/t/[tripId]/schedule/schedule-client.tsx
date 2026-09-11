"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createItineraryItem, updateItineraryItem, deleteItineraryItem,
  setItineraryStatus, type ActionState,
} from "./actions";
import {
  Badge, Button, EmptyState, Field, Input, Modal, Select, SubmitButton,
  Textarea,
} from "@/components/ui";
import { statusTone } from "@/lib/status";
import { TASK_STATUS } from "@/lib/constants";
import {
  AlertCircle, CalendarClock, CheckCircle2, MapPin, Pencil, Plus, Trash2, User,
} from "lucide-react";

export type ItineraryRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  title: string;
  location: string;
  responsible: string;
  notes: string;
  status: string;
  audience: string;
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function dateLabel(v: string) {
  if (!v) return "Sem data definida";
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} — ${WEEKDAYS[date.getUTCDay()]}`;
}

export function ScheduleClient({
  tripId,
  items,
  canWrite,
}: {
  tripId: string;
  items: ItineraryRow[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ItineraryRow | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, ItineraryRow[]>();
    for (const item of items) {
      const key = item.date || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nova atividade
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-10 w-10" />}
          title="Cronograma vazio"
          description="Monte o day-by-day da viagem: traslados, refeições, passeios, reuniões e tempos livres."
        />
      ) : (
        <div className="space-y-8">
          {byDate.map(([date, dayItems]) => (
            <section key={date || "no-date"}>
              <h2 className="mb-3 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide text-brand-800">
                {dateLabel(date)}
              </h2>
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
                {dayItems.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className={`absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-white ${
                        item.status === "CONCLUIDO"
                          ? "bg-emerald-500"
                          : item.status === "CANCELADO"
                          ? "bg-rose-400"
                          : "bg-ember-500"
                      }`}
                    />
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-brand-700">
                            {item.startTime || "—"}
                            {item.endTime && ` – ${item.endTime}`}
                            {item.timezone && (
                              <span className="ml-1 font-normal text-slate-400">
                                ({item.timezone})
                              </span>
                            )}
                          </p>
                          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.location}
                              </span>
                            )}
                            {item.responsible && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {item.responsible}
                              </span>
                            )}
                            {item.audience !== "TODOS" && (
                              <Badge tone="violet">{item.audience}</Badge>
                            )}
                          </div>
                          {item.notes && (
                            <p className="mt-1.5 text-xs text-slate-500">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={statusTone(item.status)}>
                            {TASK_STATUS[item.status] ?? item.status}
                          </Badge>
                          {canWrite && (
                            <>
                              {item.status !== "CONCLUIDO" && (
                                <form
                                  action={setItineraryStatus.bind(null, tripId, item.id, "CONCLUIDO")}
                                >
                                  <Button variant="ghost" size="sm" title="Concluir" type="submit">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                </form>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <form action={deleteItineraryItem.bind(null, tripId, item.id)}>
                                <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ItemModal
          tripId={tripId}
          item={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function ItemModal({
  tripId,
  item,
  onClose,
}: {
  tripId: string;
  item?: ItineraryRow;
  onClose: () => void;
}) {
  const action = item
    ? updateItineraryItem.bind(null, tripId, item.id)
    : createItineraryItem.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={item ? "Editar atividade" : "Nova atividade"} wide>
      <form action={formAction} className="space-y-4">
        <Field label="Atividade *">
          <Input name="title" required defaultValue={item?.title} placeholder="Ex.: Traslado hotel → aeroporto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Data">
            <Input name="date" type="date" defaultValue={item?.date} />
          </Field>
          <Field label="Início">
            <Input name="startTime" type="time" defaultValue={item?.startTime} />
          </Field>
          <Field label="Fim">
            <Input name="endTime" type="time" defaultValue={item?.endTime} />
          </Field>
          <Field label="Fuso">
            <Input name="timezone" defaultValue={item?.timezone} placeholder="BRT, CET…" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Local">
            <Input name="location" defaultValue={item?.location} />
          </Field>
          <Field label="Responsáveis">
            <Input name="responsible" defaultValue={item?.responsible} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={item?.status ?? "PENDENTE"}>
              {Object.entries(TASK_STATUS)
                .filter(([k]) => k !== "ATRASADO")
                .map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
            </Select>
          </Field>
          <Field label="Público (visível no portal do passageiro)">
            <Select name="audience" defaultValue={item?.audience ?? "TODOS"}>
              <option value="TODOS">Todos os passageiros</option>
              <option value="STAFF">Somente staff (interno)</option>
            </Select>
          </Field>
        </div>
        <Field label="Observações">
          <Textarea name="notes" defaultValue={item?.notes} />
        </Field>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>{item ? "Salvar" : "Adicionar"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
