import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { protocolOf } from "@/lib/briefing";
import { toRequestDetail } from "@/lib/request-view";
import { linhaDiretaConfigured, linhaDiretaPhone } from "@/lib/portal-config";
import { PageHeader } from "@/components/ui";
import { SolicitacoesClient } from "./solicitacoes-client";
import { AlertCircle } from "lucide-react";

export default async function SolicitacoesPage() {
  const session = await requireStaff();
  const requests = await db.travelRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      passengers: { orderBy: { sortOrder: "asc" } },
      quotes: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Linha direta — solicitações de viagem"
        subtitle="Briefings enviados pelos associados ABRADILAN, na ordem de chegada."
      />

      {!linhaDiretaConfigured() && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          O WhatsApp do atendente dedicado ainda não foi configurado
          (<code>LINHA_DIRETA_WHATSAPP</code> no .env). As solicitações continuam
          sendo registradas aqui, mas não há disparo automático.
        </p>
      )}
      {linhaDiretaConfigured() && (
        <p className="mb-4 text-xs text-slate-400">
          Atendente dedicado: {linhaDiretaPhone()}
        </p>
      )}

      <SolicitacoesClient
        canWrite={canWrite(session.role)}
        requests={requests.map((r) => ({
          id: r.id,
          protocol: protocolOf(r.id),
          requesterName: r.requesterName,
          requesterEmail: r.requesterEmail,
          requesterPhone: r.requesterPhone,
          companyName: r.companyName,
          kind: r.kind,
          origin: r.origin,
          destination: r.destination,
          departDate: r.departDate?.toISOString() ?? null,
          returnDate: r.returnDate?.toISOString() ?? null,
          flexibleDates: r.flexibleDates,
          pax: r.pax,
          budget: r.budget,
          purpose: r.purpose,
          notes: r.notes,
          status: r.status,
          handledBy: r.handledBy,
          dispatchLog: r.dispatchLog,
          createdAt: r.createdAt.toISOString(),
          detail: toRequestDetail(r),
          chosenQuoteId: r.chosenQuoteId,
          events: r.events.map((e) => ({
            status: e.status,
            note: e.note,
            actorName: e.actorName,
            createdAt: e.createdAt.toISOString(),
          })),
          quotes: r.quotes.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            currency: q.currency,
            totalAmount: q.totalAmount,
            perPaxAmount: q.perPaxAmount,
            validUntil: q.validUntil?.toISOString().slice(0, 10) ?? null,
            createdBy: q.createdBy,
          })),
        }))}
      />
    </div>
  );
}
