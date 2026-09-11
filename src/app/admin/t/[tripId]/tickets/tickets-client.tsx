"use client";

import { useActionState, useEffect, useState } from "react";
import { replyTicket, setTicketStatus, type ActionState } from "./actions";
import {
  Badge, Button, EmptyState, Modal, Select, SubmitButton, Table, Td, Th,
  Textarea,
} from "@/components/ui";
import { statusTone } from "@/lib/status";
import { TICKET_STATUS } from "@/lib/constants";
import { AlertCircle, LifeBuoy, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type TicketRow = {
  id: string;
  subject: string;
  status: string;
  passengerName: string;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    authorType: string;
    authorName: string;
    body: string;
    createdAt: string;
  }[];
};

export function TicketsClient({
  tripId,
  tickets,
  canWrite,
}: {
  tripId: string;
  tickets: TicketRow[];
  canWrite: boolean;
}) {
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : tickets;

  return (
    <>
      <div className="mb-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">Status: todos</option>
          {Object.entries(TICKET_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-10 w-10" />}
          title="Nenhum chamado"
          description="Os chamados abertos pelos passageiros no portal aparecem aqui."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Assunto</Th>
              <Th>Passageiro</Th>
              <Th>Aberto em</Th>
              <Th>Atualizado</Th>
              <Th>Status</Th>
              <Th className="w-24"></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{t.subject}</Td>
                <Td>{t.passengerName}</Td>
                <Td>{t.createdAt}</Td>
                <Td>{t.updatedAt}</Td>
                <Td>
                  <Badge tone={statusTone(t.status)}>
                    {TICKET_STATUS[t.status] ?? t.status}
                  </Badge>
                </Td>
                <Td>
                  <Button variant="outline" size="sm" onClick={() => setOpenTicket(t)}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.messages.length}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {openTicket && (
        <TicketModal
          tripId={tripId}
          ticket={openTicket}
          canWrite={canWrite}
          onClose={() => setOpenTicket(null)}
        />
      )}
    </>
  );
}

function TicketModal({
  tripId,
  ticket,
  canWrite,
  onClose,
}: {
  tripId: string;
  ticket: TicketRow;
  canWrite: boolean;
  onClose: () => void;
}) {
  const action = replyTicket.bind(null, tripId, ticket.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${ticket.subject} — ${ticket.passengerName}`}
      wide
    >
      <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm shadow-sm",
              m.authorType === "STAFF"
                ? "ml-auto bg-brand-700 text-white"
                : "bg-white text-slate-800"
            )}
          >
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p
              className={cn(
                "mt-1 text-[10px]",
                m.authorType === "STAFF" ? "text-brand-100" : "text-slate-400"
              )}
            >
              {m.authorName} · {m.createdAt}
            </p>
          </div>
        ))}
      </div>

      {canWrite && (
        <>
          <form action={formAction} className="space-y-3">
            <Textarea name="body" required placeholder="Escreva a resposta ao passageiro…" />
            {state.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {ticket.status !== "RESOLVIDO" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await setTicketStatus(tripId, ticket.id, "RESOLVIDO");
                      onClose();
                    }}
                  >
                    Marcar como resolvido
                  </Button>
                )}
              </div>
              <SubmitButton>Responder</SubmitButton>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
