"use client";

import { useState } from "react";
import Link from "next/link";
import { cancelTravelRequest, resendOwnCopy, chooseQuote } from "../actions";
import { RequestDetail, type RequestDetailData } from "@/components/request-detail";
import { RequestTimeline, type StageEvent } from "@/components/request-timeline";
import { Badge, Button, Card, CardBody, Modal, Textarea } from "@/components/ui";
import { TRAVEL_REQUEST_STATUS, CURRENCIES } from "@/lib/constants";
import { formatDateTimeBR, formatDateBR } from "@/lib/utils";
import {
  Pencil, Ban, Send, MessageCircle, Lock, ArrowLeft, CheckCircle2, Star,
  AlertCircle,
} from "lucide-react";

export type QuoteView = {
  id: string;
  title: string;
  description: string;
  currency: string;
  totalAmount: number;
  perPaxAmount: number;
  validUntil: string | null;
};

function money(currency: string, amount: number) {
  const symbol = CURRENCIES[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statusTone: Record<string, string> = {
  NOVO: "amber",
  EM_ATENDIMENTO: "blue",
  COTADO: "violet",
  FECHADO: "green",
  CANCELADO: "rose",
};

export function DetailClient({
  id,
  protocol,
  status,
  createdAt,
  editedAt,
  copyLog,
  canEdit,
  canCancel,
  detail,
  events,
  quotes,
  chosenQuoteId,
}: {
  id: string;
  protocol: string;
  status: string;
  createdAt: string;
  editedAt: string | null;
  copyLog: string;
  canEdit: boolean;
  canCancel: boolean;
  detail: RequestDetailData;
  events: StageEvent[];
  quotes: QuoteView[];
  chosenQuoteId: string | null;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);
  const [choosing, setChoosing] = useState<QuoteView | null>(null);

  return (
    <>
      <Link
        href="/app/solicitacoes"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todas as minhas solicitações
      </Link>

      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={statusTone[status] ?? "slate"}>
                  {TRAVEL_REQUEST_STATUS[status] ?? status}
                </Badge>
                <span className="font-mono text-xs text-slate-400">#{protocol}</span>
              </div>
              <p className="text-xs text-slate-400">
                Enviada em {formatDateTimeBR(createdAt)}
                {editedAt && ` · alterada em ${formatDateTimeBR(editedAt)}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <Link
                  href={`/app/solicitacoes/${id}/editar`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  <Pencil className="h-3.5 w-3.5" /> Alterar
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  <Lock className="h-3.5 w-3.5" /> Em atendimento — alterações pelo
                  atendente
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const r = await resendOwnCopy(id);
                  setNotice({ text: r.detail, link: r.link });
                }}
              >
                <Send className="h-3.5 w-3.5" /> Reenviar cópia
              </Button>

              {canCancel && (
                <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
                  <Ban className="h-3.5 w-3.5 text-rose-500" /> Cancelar
                </Button>
              )}
            </div>
          </div>

          <RequestTimeline status={status} events={events} audience="ASSOCIADO" />

          {quotes.length > 0 && (
            <section className="border-t border-slate-100 pt-5">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {status === "COTADO" ? "Escolha a sua opção" : "Opções apresentadas"}
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                {status === "COTADO"
                  ? "Compare as alternativas abaixo e confirme a que preferir. O atendente segue com a emissão em seguida."
                  : "Estas foram as alternativas montadas pelo atendente."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {quotes.map((q) => {
                  const chosen = q.id === chosenQuoteId;
                  return (
                    <Card
                      key={q.id}
                      className={
                        chosen
                          ? "border-brand-500 ring-1 ring-brand-500"
                          : "transition-shadow hover:shadow-md"
                      }
                    >
                      <CardBody className="flex h-full flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{q.title}</p>
                          {chosen && (
                            <Badge tone="green">
                              <Star className="h-3 w-3" /> escolhida
                            </Badge>
                          )}
                        </div>

                        {q.description && (
                          <p className="mt-1.5 flex-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                            {q.description}
                          </p>
                        )}

                        <div className="mt-3">
                          <p className="text-lg font-bold text-brand-700">
                            {money(q.currency, q.perPaxAmount)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            por passageiro · total {money(q.currency, q.totalAmount)}
                          </p>
                          {q.validUntil && (
                            <p className="mt-1 text-[11px] text-amber-700">
                              Tarifa válida até {formatDateBR(q.validUntil)}
                            </p>
                          )}
                        </div>

                        {status === "COTADO" && (
                          <Button
                            className="mt-3 w-full"
                            size="sm"
                            onClick={() => setChoosing(q)}
                          >
                            Escolher esta
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <div className="border-t border-slate-100 pt-5">
            <RequestDetail r={detail} />
          </div>

          {copyLog && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Cópia ao solicitante: {copyLog}
            </p>
          )}
        </CardBody>
      </Card>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancelar solicitação"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            O atendente será avisado do cancelamento. Esta ação não pode ser
            desfeita — se precisar, envie uma nova solicitação depois.
          </p>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do cancelamento (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelling(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const r = await cancelTravelRequest(id, reason.trim());
                setCancelling(false);
                if (!r.ok) setNotice({ text: r.error ?? "Falha ao cancelar." });
              }}
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!choosing}
        onClose={() => setChoosing(null)}
        title="Confirmar escolha"
      >
        {choosing && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Você está escolhendo <strong>{choosing.title}</strong>, no valor de{" "}
              <strong>{money(choosing.currency, choosing.perPaxAmount)}</strong> por
              passageiro (total {money(choosing.currency, choosing.totalAmount)}).
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              O atendente será avisado na hora e seguirá para a emissão. Para trocar
              depois, será preciso falar com ele.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChoosing(null)}>
                Voltar
              </Button>
              <Button
                onClick={async () => {
                  const r = await chooseQuote(id, choosing.id);
                  setChoosing(null);
                  if (!r.ok) setNotice({ text: r.error ?? "Falha ao escolher." });
                  else
                    setNotice({
                      text: "Opção confirmada. O atendente já foi avisado e segue com a emissão.",
                    });
                }}
              >
                Confirmar escolha
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!notice} onClose={() => setNotice(null)} title="Aviso">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {notice?.text}
          </p>
          {notice?.link && (
            <a
              href={notice.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
            </a>
          )}
        </div>
      </Modal>
    </>
  );
}
