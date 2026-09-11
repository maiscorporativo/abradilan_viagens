import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { toInputDate } from "@/lib/utils";
import { HotelsClient } from "./hotels-client";

export default async function HotelsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const [hotels, passengers] = await Promise.all([
    db.accommodation.findMany({
      where: { tripId },
      orderBy: { checkIn: "asc" },
      include: {
        passengers: { include: { passenger: { select: { id: true, name: true } } } },
      },
    }),
    db.passenger.findMany({
      where: { tripId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Hospedagens"
        subtitle="Hotéis e acomodações da viagem, com atribuição de quartos por passageiro."
      />
      <HotelsClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        passengers={passengers}
        hotels={hotels.map((h) => ({
          id: h.id,
          name: h.name,
          address: h.address,
          city: h.city,
          country: h.country,
          phone: h.phone,
          checkIn: toInputDate(h.checkIn),
          checkOut: toInputDate(h.checkOut),
          notes: h.notes,
          passengers: h.passengers.map((hp) => ({
            id: hp.passenger.id,
            name: hp.passenger.name,
            roomNumber: hp.roomNumber,
            roomType: hp.roomType,
          })),
        }))}
      />
    </div>
  );
}
