import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PassengerForm } from "../passenger-form";

export default async function NewPassengerPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireTripWriter(tripId);
  const [titulars, groups] = await Promise.all([
    db.passenger.findMany({
      where: { tripId, type: "TITULAR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.tripGroup.findMany({ where: { tripId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novo passageiro" />
      <PassengerForm
        tripId={tripId}
        titulars={titulars}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
