import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess, canWrite } from "@/lib/auth";
import { baseUrl } from "@/lib/portal-config";
import { formatDateTimeBR } from "@/lib/utils";
import { DELIVERY_CHANNELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { InvitesClient } from "./invites-client";

export default async function InvitesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { invitesEnabled: true, individualPool: true },
  });
  if (!trip?.invitesEnabled) notFound();

  const [invites, companies] = await Promise.all([
    db.invite.findMany({
      where: { tripId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        company: { select: { id: true, companyName: true } },
        table: { select: { number: true } },
        deliveries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.eventCompany.findMany({
      where: { tripId },
      orderBy: { companyName: "asc" },
      include: {
        _count: { select: { invites: true } },
        invites: { where: { status: "CANCELADO" }, select: { id: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Convidados"
        subtitle="Emissão, disparo e acompanhamento dos convites digitais do evento."
      />
      <InvitesClient
        tripId={tripId}
        baseUrl={baseUrl()}
        canWrite={canWrite(session.role)}
        individualPool={trip.individualPool}
        companies={companies.map((c) => ({
          id: c.id,
          name: c.companyName,
          remaining: Math.max(
            0,
            c.quota - (c._count.invites - c.invites.length)
          ),
        }))}
        invites={invites.map((i) => {
          const last = i.deliveries[0];
          return {
            id: i.id,
            name: i.name,
            role: i.role,
            email: i.email,
            phone: i.phone,
            kind: i.kind,
            status: i.status,
            code: i.code,
            token: i.token,
            companyId: i.companyId,
            companyName: i.company?.companyName ?? "",
            tableLabel:
              i.table?.number != null
                ? `Mesa ${i.table.number}${i.seat != null ? ` · cadeira ${i.seat}` : ""}`
                : "",
            notes: i.notes,
            lastDelivery: last
              ? `${DELIVERY_CHANNELS[last.channel] ?? last.channel} · ${formatDateTimeBR(last.createdAt)}`
              : "",
          };
        })}
      />
    </>
  );
}
