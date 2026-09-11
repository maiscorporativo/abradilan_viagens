"use client";

import { useActionState, useEffect, useState } from "react";
import { createTicket, replyTicketAsPassenger, type ActionState } from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal,
  SubmitButton, Textarea,
} from "@/components/ui";
import { statusTone } from "@/lib/status";
import { TICKET_STATUS } from "@/lib/constants";
import { AlertCircle, LifeBuoy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  messages: {
    id: string;
    authorType: string;
    authorName: string;
    body: string;
    createdAt: string;
  }[];
};

export function SuporteClient({ tickets }: { tickets: TicketRow[] }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openTicket = tickets.find((t) => t.id === openId) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Suporte</h2>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Abrir chamado
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-10 w-10" />}
          title="Nenhum chamado aberto"
          description="Precisa de ajuda com a viagem? Abra um chamado e a organização responderá por aqui."
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer transition hover:border-brand-400"
              onClick={() => setOpenId(t.id)}
            >
              <CardBody className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{t.subject}</p>
                  <p className="text-[11px] text-slate-400">
                    {t.messages.length} mensagem(ns) · atualizado {t.updatedAt}
                  </p>
                </div>
                <Badge tone={statusTone(t.status)}>
                  {TICKET_STATUS[t.status] ?? t.status}
                </Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {creating && <NewTicketModal onClose={() => setCreating(false)} />}
      {openTicket && (
        <TicketThreadModal ticket={openTicket} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createTicket, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title="Abrir chamado">
      <form action={formAction} className="space-y-4">
        <Field label="Assunto *">
          <Input name="subject" required placeholder="Ex.: Dúvida sobre bagagem" />
        </Field>
        <Field label="Mensagem *">
          <Textarea name="body" required className="min-h-28" />
        </Field>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>Enviar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function TicketThreadModal({
  ticket,
  onClose,
}: {
  ticket: TicketRow;
  onClose: () => void;
}) {
  const action = replyTicketAsPassenger.bind(null, ticket.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <Modal open onClose={onClose} title={ticket.subject} wide>
      <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm shadow-sm",
              m.authorType === "PASSAGEIRO"
                ? "ml-auto bg-brand-700 text-white"
                : "bg-white text-slate-800"
            )}
          >
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p
              className={cn(
                "mt-1 text-[10px]",
                m.authorType === "PASSAGEIRO" ? "text-brand-100" : "text-slate-400"
              )}
            >
              {m.authorType === "PASSAGEIRO" ? "Você" : m.authorName} · {m.createdAt}
            </p>
          </div>
        ))}
      </div>

      <form action={formAction} className="space-y-3">
        <Textarea name="body" required placeholder="Escreva sua mensagem…" />
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end">
          <SubmitButton>Enviar mensagem</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
