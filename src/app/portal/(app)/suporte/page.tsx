import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { formatDateTimeBR } from "@/lib/utils";
import { SuporteClient } from "./suporte-client";

export default async function SuportePage() {
  const session = await requirePassenger();
  const tickets = await db.ticket.findMany({
    where: { passengerId: session.passengerId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <SuporteClient
      tickets={tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
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
  );
}
