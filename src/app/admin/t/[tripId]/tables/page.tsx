import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TablesClient } from "./tables-client";

export default async function TablesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { invitesEnabled: true, tablesEnabled: true },
  });
  if (!trip?.invitesEnabled || !trip.tablesEnabled) notFound();

  const [tables, invites] = await Promise.all([
    db.eventTable.findMany({ where: { tripId }, orderBy: { number: "asc" } }),
    db.invite.findMany({
      where: { tripId, status: { not: "CANCELADO" } },
      orderBy: { name: "asc" },
      include: { company: { select: { companyName: true } } },
    }),
  ]);

  const occupants = invites.map((i) => ({
    id: i.id,
    name: i.name,
    companyName: i.company?.companyName ?? "",
    tableId: i.tableId,
    seat: i.seat,
  }));

  return (
    <>
      <PageHeader
        title="Mapa de mesas"
        subtitle="Organize o salão e defina mesa e cadeira de cada convidado — a informação aparece no convite digital."
      />
      <TablesClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        tables={tables.map((t) => ({
          id: t.id,
          number: t.number,
          name: t.name,
          capacity: t.capacity,
          shape: t.shape,
          x: t.x,
          y: t.y,
        }))}
        occupants={occupants}
        unseated={occupants
          .filter((o) => !o.tableId)
          .map((o) => ({ id: o.id, name: o.name, companyName: o.companyName }))}
      />
    </>
  );
}
