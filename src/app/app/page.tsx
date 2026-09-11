import Link from "next/link";
import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { aereoUrl } from "@/lib/portal-config";
import { Card, CardBody, Badge } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import {
  TRAVEL_REQUEST_KINDS, TRAVEL_REQUEST_STATUS,
} from "@/lib/constants";
import {
  Plane, CalendarDays, Headset, ArrowRight, ExternalLink, Clock,
} from "lucide-react";

export default async function AssociateHome() {
  const session = await requireAssociate();

  // Números que dão contexto aos cards, sem exigir que o associado navegue.
  const [openEvents, myRequests] = await Promise.all([
    db.trip.count({
      where: { kind: "EVENTO", status: { notIn: ["ARQUIVADA", "CONCLUIDA"] } },
    }),
    db.travelRequest.findMany({
      where: { associateId: session.associateId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true, destination: true, status: true, createdAt: true, kind: true,
      },
    }),
  ]);

  const services = [
    {
      title: "Consulta e solicitação de aéreo",
      description:
        "Pesquise tarifas, monte o itinerário e solicite a emissão das passagens no sistema de aéreo.",
      icon: Plane,
      href: aereoUrl(),
      external: true,
      cta: "Abrir sistema de aéreo",
      accent: "from-ember-500 to-ember-700",
    },
    {
      title: "Eventos ABRADILAN",
      description:
        "Convites, confirmação de presença, credenciamento e todos os detalhes dos eventos da associação.",
      icon: CalendarDays,
      href: "/app/eventos",
      external: false,
      cta: openEvents > 0 ? `Ver eventos (${openEvents})` : "Ver eventos",
      accent: "from-brand-500 to-brand-700",
    },
    {
      title: "Linha direta de viagens",
      description:
        "Envie o briefing da sua viagem e fale direto com o atendente dedicado aos associados ABRADILAN.",
      icon: Headset,
      href: "/app/linha-direta",
      external: false,
      cta: "Solicitar uma viagem",
      accent: "from-sun-500 to-sun-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {session.name.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o serviço que você precisa hoje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ title, description, icon: Icon, href, external, cta, accent }) => {
          const inner = (
            <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
              <div className={`bg-gradient-to-br ${accent} px-5 py-6 text-white`}>
                <Icon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <CardBody className="flex flex-1 flex-col">
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
                  {description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  {cta}
                  {external ? (
                    <ExternalLink className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </span>
              </CardBody>
            </Card>
          );

          return external ? (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          ) : (
            <Link key={title} href={href}>
              {inner}
            </Link>
          );
        })}
      </div>

      {myRequests.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="h-4 w-4 text-slate-400" />
              Suas últimas solicitações
            </h2>
            <Link
              href="/app/solicitacoes"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <Card>
            <ul className="divide-y divide-slate-100">
              {myRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/solicitacoes/${r.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {r.destination || "Destino a definir"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {TRAVEL_REQUEST_KINDS[r.kind] ?? r.kind} · enviada em{" "}
                        {formatDateBR(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={r.status === "NOVO" ? "amber" : "teal"}>
                        {TRAVEL_REQUEST_STATUS[r.status] ?? r.status}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
