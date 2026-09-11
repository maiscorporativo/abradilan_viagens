import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { toInputDate } from "@/lib/utils";
import { ChecklistClient } from "./checklist-client";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;
  const items = await db.checklistItem.findMany({
    where: { tripId },
    orderBy: [{ endDate: "asc" }, { createdAt: "asc" }],
  });

  const today = new Date();
  const overdue = items.filter(
    (i) =>
      i.status !== "CONCLUIDO" &&
      i.endDate &&
      i.endDate < today
  ).length;

  return (
    <div>
      <PageHeader
        title="Checklist operacional"
        subtitle={`${items.length} tarefas · ${items.filter((i) => i.status === "CONCLUIDO").length} concluídas · ${overdue} atrasadas`}
      />
      <ChecklistClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        items={items.map((i) => ({
          id: i.id,
          subject: i.subject,
          category: i.category,
          responsible: i.responsible,
          startDate: toInputDate(i.startDate),
          endDate: toInputDate(i.endDate),
          status: i.status,
          notes: i.notes,
          history: i.history,
        }))}
      />
    </div>
  );
}
