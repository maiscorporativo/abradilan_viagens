import Link from "next/link";
import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { protocolOf, itineraryLabel } from "@/lib/briefing";
import { formatDateTimeBR } from "@/lib/utils";
import {
  TRAVEL_REQUEST_KINDS, TRAVEL_REQUEST_STATUS,
} from "@/lib/constants";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { Headset, ArrowRight, Plus } from "lucide-react";

const statusTone: Record<string, string> = {
  NOVO: "amber",
  EM_ATENDIMENTO: "blue",
  COTADO: "violet",
  FECHADO: "green",
  CANCELADO: "rose",
};

export default async function MinhasSolicitacoesPage() {
  const session = await requireAssociate();

  const requests = await db.travelRequest.findMany({
    where: { associateId: session.associateId },
    orderBy: { createdAt: "desc" },
    include: { segments: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <PageHeader
        title="Minhas solicitações"
        subtitle="Acompanhe, revise e altere os pedidos enviados pela linha direta."
        actions={
          <Link
            href="/app/linha-direta"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" /> Nova solicitação
          </Link>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={<Headset className="h-8 w-8" />}
          title="Você ainda não enviou nenhuma solicitação"
          description="Use a linha direta para pedir passagens, hospedagem e demais serviços da sua viagem."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link key={r.id} href={`/app/solicitacoes/${r.id}`}>
              <Card className="group transition-shadow hover:shadow-md">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone[r.status] ?? "slate"}>
                        {TRAVEL_REQUEST_STATUS[r.status] ?? r.status}
                      </Badge>
                      <span className="font-mono text-[11px] text-slate-400">
                        #{protocolOf(r.id)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-bold text-slate-900">
                      {itineraryLabel(r.segments) || r.destination || "Sem itinerário"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {TRAVEL_REQUEST_KINDS[r.kind] ?? r.kind} · {r.pax}{" "}
                      {r.pax === 1 ? "passageiro" : "passageiros"} · enviada em{" "}
                      {formatDateTimeBR(r.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
