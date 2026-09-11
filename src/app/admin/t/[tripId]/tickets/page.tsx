import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/utils";
import { TicketsClient } from "./tickets-client";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const tickets = await db.ticket.findMany({
    where: { tripId },
    orderBy: { updatedAt: "desc" },
    include: {
      passenger: { select: { name: true, cpf: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  const open = tickets.filter((t) => t.status === "NOVO").length;

  return (
    <div>
      <PageHeader
        title="Suporte aos passageiros"
        subtitle={`${tickets.length} chamados · ${open} aguardando primeira resposta`}
      />
      <TicketsClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        tickets={tickets.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          passengerName: t.passenger.name,
          createdAt: formatDateTimeBR(t.createdAt),
          updatedAt: formatDateTimeBR(t.updatedAt),
          messages: t.messages.map((m) => ({
            id: m.id,
            authorType: m.authorType,
            authorName: m.authorName,
            body: m.body,
            createdAt: formatDateTimeBR(m.createdAt),
          })),
        }))}
      />
    </div>
  );
}
