import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess, canWrite } from "@/lib/auth";
import { formatDateBR } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      invitesEnabled: true,
      individualPool: true,
      invitesExpired: true,
      inviteDeadline: true,
    },
  });
  if (!trip) notFound();
  // A aba só existe para eventos com o módulo de convites ligado.
  if (!trip.invitesEnabled) notFound();

  const companies = await db.eventCompany.findMany({
    where: { tripId },
    orderBy: { companyName: "asc" },
    include: {
      _count: { select: { invites: true } },
      invites: { where: { status: "CANCELADO" }, select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Empresas e cotas"
        subtitle="Cada empresa recebe login próprio para inscrever seus convidados até o limite da cota."
      />
      <CompaniesClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        individualPool={trip.individualPool}
        invitesExpired={trip.invitesExpired}
        deadline={trip.inviteDeadline ? formatDateBR(trip.inviteDeadline) : null}
        companies={companies.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          contactName: c.contactName,
          contactRole: c.contactRole,
          email: c.email,
          phone: c.phone,
          login: c.login,
          provisionalPassword: c.provisionalPassword,
          quota: c.quota,
          // Cancelados não consomem cota, como no sistema de origem.
          used: c._count.invites - c.invites.length,
        }))}
      />
    </>
  );
}
