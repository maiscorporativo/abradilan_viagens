import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/utils";
import { MuralClient } from "./mural-client";

export default async function MuralPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const [posts, groups, passengers] = await Promise.all([
    db.muralPost.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    }),
    db.tripGroup.findMany({ where: { tripId }, orderBy: { name: "asc" } }),
    db.passenger.findMany({
      where: { tripId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));
  const passengerMap = new Map(passengers.map((p) => [p.id, p.name]));

  return (
    <div>
      <PageHeader
        title="Mural de recados"
        subtitle="Comunicados exibidos na área do passageiro — para todos, por grupo ou individuais."
      />
      <MuralClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        passengers={passengers}
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          message: p.message,
          targetType: p.targetType,
          targetValue: p.targetValue,
          targetLabel:
            p.targetType === "GRUPO"
              ? groupMap.get(p.targetValue) ?? "Grupo removido"
              : p.targetType === "INDIVIDUAL"
              ? passengerMap.get(p.targetValue) ?? "Passageiro removido"
              : "Todos",
          urgent: p.urgent,
          active: p.active,
          author: p.author,
          createdAt: formatDateTimeBR(p.createdAt),
        }))}
      />
    </div>
  );
}
