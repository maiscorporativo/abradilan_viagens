import { notFound } from "next/navigation";
import { requireAssociate } from "@/lib/auth";
import { protocolOf, itineraryLabel } from "@/lib/briefing";
import { toRequestDetail } from "@/lib/request-view";
import {
  loadOwnRequest, canAssociateEdit, canAssociateCancel,
} from "@/lib/travel-request";
import { PageHeader } from "@/components/ui";
import { DetailClient } from "./detail-client";

export default async function SolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAssociate();

  // loadOwnRequest já filtra pelo associado logado: uma solicitação de outro
  // associado simplesmente não existe para esta página.
  const request = await loadOwnRequest(id, session.associateId);
  if (!request) notFound();

  return (
    <>
      <PageHeader
        title={itineraryLabel(request.segments) || request.destination || "Solicitação"}
        subtitle="Detalhes do que você pediu à linha direta de viagens."
      />
      <DetailClient
        id={request.id}
        protocol={protocolOf(request.id)}
        status={request.status}
        createdAt={request.createdAt.toISOString()}
        editedAt={request.editedAt?.toISOString() ?? null}
        copyLog={request.copyLog}
        canEdit={canAssociateEdit(request.status)}
        canCancel={canAssociateCancel(request.status)}
        detail={toRequestDetail(request)}
        chosenQuoteId={request.chosenQuoteId}
        events={request.events.map((e) => ({
          status: e.status,
          note: e.note,
          actorName: e.actorName,
          createdAt: e.createdAt.toISOString(),
        }))}
        quotes={request.quotes.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          currency: q.currency,
          totalAmount: q.totalAmount,
          perPaxAmount: q.perPaxAmount,
          validUntil: q.validUntil?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
