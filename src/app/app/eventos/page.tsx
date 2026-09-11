import Link from "next/link";
import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateBR } from "@/lib/utils";
import { TRIP_STATUS } from "@/lib/constants";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import {
  CalendarDays, MapPin, Ticket, ArrowRight, CheckCircle2, ExternalLink,
} from "lucide-react";

export default async function EventosPage() {
  const session = await requireAssociate();

  const [events, myCompanies, myInvites] = await Promise.all([
    db.trip.findMany({
      where: { kind: "EVENTO", status: { notIn: ["ARQUIVADA"] } },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        eventTime: true,
        venueName: true,
        venueAddress: true,
        invitesEnabled: true,
        primaryColor: true,
        secondaryColor: true,
      },
    }),
    // Empresas do evento já vinculadas a esta conta de associado.
    db.eventCompany.findMany({
      where: { associateId: session.associateId },
      select: { id: true, tripId: true, companyName: true, quota: true },
    }),
    // Convites emitidos para o e-mail do associado.
    db.invite.findMany({
      where: { email: session.email, status: { not: "CANCELADO" } },
      select: { id: true, tripId: true, token: true, status: true },
    }),
  ]);

  if (events.length === 0) {
    return (
      <>
        <PageHeader
          title="Eventos ABRADILAN"
          subtitle="Convites, confirmação de presença e credenciamento."
        />
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Nenhum evento aberto no momento"
          description="Assim que a ABRADILAN publicar um novo evento, ele aparece aqui com o seu convite."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Eventos ABRADILAN"
        subtitle="Convites, confirmação de presença e credenciamento."
      />

      <div className="space-y-3">
        {events.map((e) => {
          const company = myCompanies.find((c) => c.tripId === e.id);
          const invite = myInvites.find((i) => i.tripId === e.id);
          return (
            <Card key={e.id} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: e.primaryColor }} />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{e.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {e.startDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDateBR(e.startDate)}
                          {e.eventTime ? ` às ${e.eventTime}` : ""}
                        </span>
                      )}
                      {e.venueName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.venueName}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge tone="teal">{TRIP_STATUS[e.status] ?? e.status}</Badge>
                </div>

                {e.description && (
                  <p className="text-sm leading-relaxed text-slate-600">
                    {e.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {invite && (
                    <Link
                      href={`/convite/${invite.token}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      {invite.status === "CONFIRMADO" || invite.status === "CREDENCIADO"
                        ? "Ver meu convite"
                        : "Abrir e confirmar meu convite"}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {invite?.status === "CONFIRMADO" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Presença confirmada
                    </span>
                  )}
                  {e.invitesEnabled && company && (
                    <Link
                      href="/empresa/login"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Gerenciar os {company.quota} convites de {company.companyName}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {!invite && !company && (
                    <p className="text-xs text-slate-400">
                      Você ainda não possui convite para este evento. Fale com a
                      organização.
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
