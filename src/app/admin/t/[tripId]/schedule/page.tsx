import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { toInputDate } from "@/lib/utils";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;
  const items = await db.itineraryItem.findMany({
    where: { tripId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Cronograma da viagem"
        subtitle="Day-by-day com atividades, roteiros, tempos e movimentos."
      />
      <ScheduleClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        items={items.map((i) => ({
          id: i.id,
          date: toInputDate(i.date),
          startTime: i.startTime,
          endTime: i.endTime,
          timezone: i.timezone,
          title: i.title,
          location: i.location,
          responsible: i.responsible,
          notes: i.notes,
          status: i.status,
          audience: i.audience,
        }))}
      />
    </div>
  );
}
