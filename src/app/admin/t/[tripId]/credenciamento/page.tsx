import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CredenciamentoClient } from "./credenciamento-client";

export default async function CredenciamentoPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { invitesEnabled: true },
  });
  if (!trip?.invitesEnabled) notFound();

  const [total, confirmed, checkedIn, recent] = await Promise.all([
    db.invite.count({ where: { tripId, status: { not: "CANCELADO" } } }),
    db.invite.count({
      where: { tripId, status: { in: ["CONFIRMADO", "CREDENCIADO"] } },
    }),
    db.invite.count({ where: { tripId, status: "CREDENCIADO" } }),
    db.invite.findMany({
      where: { tripId, status: "CREDENCIADO" },
      orderBy: { checkedInAt: "desc" },
      take: 15,
      include: {
        company: { select: { companyName: true } },
        table: { select: { number: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Credenciamento"
        subtitle="Leia o QR code do convite pela câmera ou digite o código curto informado pelo convidado."
      />
      <CredenciamentoClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        stats={{ total, confirmed, checkedIn }}
        recent={recent.map((r) => ({
          id: r.id,
          name: r.name,
          companyName: r.company?.companyName ?? "",
          seat:
            r.table?.number != null
              ? `Mesa ${r.table.number}${r.seat != null ? ` · cad. ${r.seat}` : ""}`
              : "",
          checkedInAt: r.checkedInAt?.toISOString() ?? "",
        }))}
      />
    </>
  );
}
