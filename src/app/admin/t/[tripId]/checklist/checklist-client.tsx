"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createChecklistItem, updateChecklistItem, deleteChecklistItem,
  setChecklistStatus, type ActionState,
} from "./actions";
import {
  Badge, Button, EmptyState, Field, Input, Modal, Select, SubmitButton,
  Table, Td, Th, Textarea,
} from "@/components/ui";
import { statusTone } from "@/lib/status";
import { TASK_STATUS } from "@/lib/constants";
import {
  AlertCircle, CheckCircle2, History, ListChecks, Pencil, Plus, Trash2,
} from "lucide-react";

export type ChecklistRow = {
  id: string;
  subject: string;
  category: string;
  responsible: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string;
  history: string;
};

function fmtD(v: string) {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

function isOverdue(item: ChecklistRow) {
  if (!item.endDate || item.status === "CONCLUIDO") return false;
  return item.endDate < new Date().toISOString().slice(0, 10);
}

export function ChecklistClient({
  tripId,
  items,
  canWrite,
}: {
  tripId: string;
  items: ChecklistRow[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ChecklistRow | null>(null);
  const [historyOf, setHistoryOf] = useState<ChecklistRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [respFilter, setRespFilter] = useState("");

  const responsibles = useMemo(
    () => [...new Set(items.map((i) => i.responsible).filter(Boolean))].sort(),
    [items]
  );

  const filtered = items.filter(
    (i) =>
      (!statusFilter ||
        (statusFilter === "ATRASADO" ? isOverdue(i) : i.status === statusFilter)) &&
      (!respFilter || i.responsible === respFilter)
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">Status: todos</option>
            {Object.entries(TASK_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={respFilter} onChange={(e) => setRespFilter(e.target.value)} className="w-auto">
            <option value="">Responsável: todos</option>
            {responsibles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="Nenhuma tarefa"
          description="Cadastre as tarefas operacionais da viagem com responsáveis e prazos."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Tarefa</Th>
              <Th>Categoria</Th>
              <Th>Responsável</Th>
              <Th>Início</Th>
              <Th>Prazo</Th>
              <Th>Status</Th>
              <Th className="w-32"></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <Td className="max-w-72">
                  <p className="font-medium text-slate-900">{i.subject}</p>
                  {i.notes && <p className="text-xs text-slate-400">{i.notes}</p>}
                </Td>
                <Td>{i.category || "—"}</Td>
                <Td>{i.responsible || "—"}</Td>
                <Td>{fmtD(i.startDate)}</Td>
                <Td className={isOverdue(i) ? "font-bold text-rose-600" : ""}>
                  {fmtD(i.endDate)}
                </Td>
                <Td>
                  <Badge tone={isOverdue(i) ? "rose" : statusTone(i.status)}>
                    {isOverdue(i) ? "Atrasado" : TASK_STATUS[i.status] ?? i.status}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" title="Histórico" onClick={() => setHistoryOf(i)}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    {canWrite && (
                      <>
                        {i.status !== "CONCLUIDO" && (
                          <form action={setChecklistStatus.bind(null, tripId, i.id, "CONCLUIDO")}>
                            <Button variant="ghost" size="sm" title="Concluir" type="submit">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </form>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditing(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <form action={deleteChecklistItem.bind(null, tripId, i.id)}>
                          <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {(creating || editing) && (
        <TaskModal
          tripId={tripId}
          item={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {historyOf && (
        <Modal open onClose={() => setHistoryOf(null)} title={`Histórico — ${historyOf.subject}`}>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
            {historyOf.history || "Sem histórico."}
          </pre>
        </Modal>
      )}
    </>
  );
}

function TaskModal({
  tripId,
  item,
  onClose,
}: {
  tripId: string;
  item?: ChecklistRow;
  onClose: () => void;
}) {
  const action = item
    ? updateChecklistItem.bind(null, tripId, item.id)
    : createChecklistItem.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={item ? "Editar tarefa" : "Nova tarefa"} wide>
      <form action={formAction} className="space-y-4">
        <Field label="Tarefa *">
          <Input name="subject" required defaultValue={item?.subject} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Input name="category" defaultValue={item?.category} placeholder="Aéreo, Hotel, Documentação…" />
          </Field>
          <Field label="Responsável">
            <Input name="responsible" defaultValue={item?.responsible} />
          </Field>
          <Field label="Início">
            <Input name="startDate" type="date" defaultValue={item?.startDate} />
          </Field>
          <Field label="Prazo">
            <Input name="endDate" type="date" defaultValue={item?.endDate} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={item?.status ?? "PENDENTE"}>
              {Object.entries(TASK_STATUS)
                .filter(([k]) => k !== "ATRASADO" && k !== "CANCELADO")
                .map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
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
