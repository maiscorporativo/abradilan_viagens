"use client";

import { useState, useActionState } from "react";
import {
  createTable, deleteTable, seatInvite, updateTable, type TableActionState,
} from "./actions";
import { TableMap, type MapTable, type MapOccupant } from "./table-map";
import {
  Badge, Button, Field, Input, Modal, Select, SubmitButton,
} from "@/components/ui";
import { CloseOnSuccess } from "@/components/close-on-success";
import { TABLE_SHAPES } from "@/lib/constants";
import { AlertCircle, Plus, Trash2, UserMinus } from "lucide-react";

export function TablesClient({
  tripId,
  tables,
  occupants,
  unseated,
  canWrite,
}: {
  tripId: string;
  tables: MapTable[];
  occupants: MapOccupant[];
  unseated: { id: string; name: string; companyName: string }[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<MapTable | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createState, createAction] = useActionState<TableActionState, FormData>(
    async (prev, formData) => createTable(tripId, prev, formData),
    {}
  );

  const seatedAt = (tableId: string) =>
    occupants
      .filter((o) => o.tableId === tableId)
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

  const nextNumber = tables.length
    ? Math.max(...tables.map((t) => t.number)) + 1
    : 1;

  return (
    <>
      <CloseOnSuccess savedAt={createState.savedAt} onClose={() => setCreating(false)} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {canWrite
            ? "Arraste as mesas para organizar o salão. Clique em uma mesa para acomodar convidados."
            : "Passe o mouse sobre uma mesa para ver os ocupantes."}
        </p>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nova mesa
          </Button>
        )}
      </div>

      <TableMap
        tripId={tripId}
        tables={tables}
        occupants={occupants}
        editable={canWrite}
        onSelect={(t) => setSelected(t)}
      />

      {unseated.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Sem lugar definido ({unseated.length})
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {unseated.map((u) => u.name).join(" · ")}
          </p>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nova mesa">
        <form action={createAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Número">
              <Input name="number" type="number" min={1} defaultValue={nextNumber} required />
            </Field>
            <Field label="Capacidade">
              <Input name="capacity" type="number" min={1} defaultValue={8} />
            </Field>
            <Field label="Nome (opcional)">
              <Input name="name" placeholder="Mesa da diretoria" />
            </Field>
            <Field label="Formato">
              <Select name="shape" defaultValue="REDONDA">
                {Object.entries(TABLE_SHAPES).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {createState.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {createState.error}
            </p>
          )}
          <SubmitButton>Criar mesa</SubmitButton>
        </form>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setError(null);
        }}
        title={selected ? `Mesa ${selected.number}` : "Mesa"}
      >
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Ocupantes ({seatedAt(selected.id).length}/{selected.capacity})
              </p>
              {seatedAt(selected.id).length === 0 ? (
                <p className="text-sm text-slate-400">Mesa livre.</p>
              ) : (
                <ul className="space-y-1.5">
                  {seatedAt(selected.id).map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span>
                        {o.seat && <strong className="mr-1">{o.seat}.</strong>}
                        {o.name}
                        {o.companyName && (
                          <span className="text-xs text-slate-400"> · {o.companyName}</span>
                        )}
                      </span>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remover desta mesa"
                          onClick={async () => {
                            await seatInvite(tripId, o.id, null, null);
                            setSelected(null);
                          }}
                        >
                          <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canWrite && (
              <form
                className="space-y-3 border-t border-slate-100 pt-4"
                action={async (formData) => {
                  const inviteId = String(formData.get("inviteId") ?? "");
                  const rawSeat = String(formData.get("seat") ?? "").trim();
                  if (!inviteId) return;
                  const result = await seatInvite(
                    tripId,
                    inviteId,
                    selected.id,
                    rawSeat ? Number(rawSeat) : null
                  );
                  if (result.error) setError(result.error);
                  else {
                    setError(null);
                    setSelected(null);
                  }
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Acomodar convidado
                </p>
                <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                  <Select name="inviteId" defaultValue="">
                    <option value="">Selecione…</option>
                    {unseated.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.companyName ? ` — ${u.companyName}` : ""}
                      </option>
                    ))}
                  </Select>
                  <Input
                    name="seat"
                    type="number"
                    min={1}
                    max={selected.capacity}
                    placeholder="Cadeira"
                  />
                </div>
                {error && (
                  <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </p>
                )}
                <SubmitButton size="sm">Acomodar</SubmitButton>
              </form>
            )}

            {canWrite && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Badge tone="slate">
                  {TABLE_SHAPES[selected.shape] ?? selected.shape}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const raw = prompt(
                        "Nova capacidade da mesa:",
                        String(selected.capacity)
                      );
                      if (!raw) return;
                      await updateTable(tripId, selected.id, { capacity: Number(raw) });
                      setSelected(null);
                    }}
                  >
                    Alterar capacidade
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const aviso = `Excluir a mesa ${selected.number}? Os convidados acomodados ficam sem lugar definido.`;
                      if (!confirm(aviso)) return;
                      await deleteTable(tripId, selected.id);
                      setSelected(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Excluir mesa
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
