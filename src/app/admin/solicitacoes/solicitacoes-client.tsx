"use client";

import { useState } from "react";
import { resendBriefing } from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Modal,
} from "@/components/ui";
import {
  TRAVEL_REQUEST_KINDS, TRAVEL_REQUEST_STATUS, TRIP_TYPES,
} from "@/lib/constants";
import { RequestDetail, type RequestDetailData } from "@/components/request-detail";
import { RequestTimeline, type StageEvent } from "@/components/request-timeline";
import { QuotesPanel, type QuoteRow } from "./quotes-panel";
import { itineraryLabel } from "@/lib/briefing";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { Headset, Send, Mail, Phone, Building2 } from "lucide-react";

export type RequestRow = {
  id: string;
  protocol: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  companyName: string;
  kind: string;
  origin: string;
  destination: string;
  departDate: string | null;
  returnDate: string | null;
  flexibleDates: boolean;
  pax: number;
  budget: string;
  purpose: string;
  notes: string;
  status: string;
  handledBy: string;
  dispatchLog: string;
  createdAt: string;
  /** Bloco completo do briefing, renderizado no modal "Ver briefing". */
  detail: RequestDetailData;
  events: StageEvent[];
  quotes: QuoteRow[];
  chosenQuoteId: string | null;
};

const statusTone: Record<string, string> = {
  NOVO: "amber",
  EM_ATENDIMENTO: "blue",
  COTADO: "violet",
  FECHADO: "green",
  CANCELADO: "rose",
};

export function SolicitacoesClient({
  requests,
  canWrite,
}: {
  requests: RequestRow[];
  canWrite: boolean;
}) {
  const [detail, setDetail] = useState<RequestRow | null>(null);
  const [handling, setHandling] = useState<RequestRow | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendLink, setResendLink] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Headset className="h-8 w-8" />}
        title="Nenhuma solicitação recebida"
        description="Os briefings enviados pelos associados na linha direta aparecem aqui."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardBody className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[r.status] ?? "slate"}>
                    {TRAVEL_REQUEST_STATUS[r.status] ?? r.status}
                  </Badge>
                  <span className="font-mono text-[11px] text-slate-400">
                    #{r.protocol}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTimeBR(r.createdAt)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {itineraryLabel(r.detail.segments) ||
                    `${r.origin ? `${r.origin} → ` : ""}${r.destination}`}
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    {TRAVEL_REQUEST_KINDS[r.kind] ?? r.kind} ·{" "}
                    {TRIP_TYPES[r.detail.tripType] ?? r.detail.tripType} · {r.pax}{" "}
                    {r.pax === 1 ? "passageiro" : "passageiros"}
                  </span>
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {r.departDate ? `Ida ${formatDateBR(r.departDate)}` : "Sem data de ida"}
                  {r.returnDate ? ` · volta ${formatDateBR(r.returnDate)}` : ""}
                  {r.flexibleDates ? " · datas flexíveis" : ""}
                </p>

                <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {r.requesterName}
                    {r.companyName ? ` — ${r.companyName}` : ""}
                  </span>
                  {r.requesterPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {r.requesterPhone}
                    </span>
                  )}
                  {r.requesterEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {r.requesterEmail}
                    </span>
                  )}
                </p>

                <div className="mt-3 max-w-xl">
                  <RequestTimeline status={r.status} events={r.events} audience="STAFF" />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetail(r)}>
                  Ver briefing
                </Button>
                <Button size="sm" onClick={() => setHandling(r)}>
                  Atender
                </Button>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Reenviar briefing ao atendente"
                    onClick={async () => {
                      const res = await resendBriefing(r.id);
                      setResendLink(res.link ?? null);
                      setResendMsg(
                        res.ok
                          ? "Briefing reenviado ao atendente."
                          : res.error ?? "Falha no reenvio."
                      );
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? "Briefing #" + detail.protocol : "Briefing"}
      >
        {detail && <RequestDetail r={detail.detail} />}
      </Modal>

      <Modal
        open={!!handling}
        onClose={() => setHandling(null)}
        title={handling ? "Atendimento #" + handling.protocol : "Atendimento"}
      >
        {handling && (
          <QuotesPanel
            requestId={handling.id}
            status={handling.status}
            events={handling.events}
            quotes={handling.quotes}
            chosenQuoteId={handling.chosenQuoteId}
            canWrite={canWrite}
          />
        )}
      </Modal>

      <Modal
        open={!!resendMsg}
        onClose={() => {
          setResendMsg(null);
          setResendLink(null);
        }}
        title="Reenvio do briefing"
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>{resendMsg}</p>
          {resendLink && (
            <a
              href={resendLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Send className="h-4 w-4" /> Enviar pelo WhatsApp Web
            </a>
          )}
        </div>
      </Modal>
    </>
  );
}
