import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { FlightsClient } from "./flights-client";
import { toInputDateTime } from "@/lib/utils";

export default async function FlightsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const [flights, passengers, airlines, airports] = await Promise.all([
    db.flight.findMany({
      where: { tripId },
      orderBy: [{ depDateTime: "asc" }],
      include: {
        locators: { orderBy: { code: "asc" } },
        passengers: { include: { passenger: { select: { id: true, name: true } } } },
      },
    }),
    db.passenger.findMany({
      where: { tripId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    db.airline.findMany({ orderBy: { name: "asc" } }),
    db.airport.findMany({ orderBy: { iata: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Voos"
        subtitle={
          <>
            Cadastre os trechos aéreos e vincule os passageiros de cada voo.{" "}
            <Link href="/admin/airlines" className="font-semibold text-brand-700 hover:underline">
              Gerenciar catálogo de cias e aeroportos →
            </Link>
          </>
        }
      />
      <FlightsClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        airlines={airlines.map((a) => ({
          code: a.code,
          name: a.name,
          hasLogo: !!a.logoPath,
        }))}
        airports={airports.map((a) => ({
          iata: a.iata,
          label: [a.city || a.name, a.country].filter(Boolean).join(", "),
        }))}
        passengers={passengers}
        flights={flights.map((f) => ({
          id: f.id,
          scope: f.scope,
          flightNumber: f.flightNumber,
          airlineCode: f.airlineCode,
          airlineName: f.airlineName,
          operatedBy: f.operatedBy,
          originIata: f.originIata,
          originName: f.originName,
          destIata: f.destIata,
          destName: f.destName,
          depDateTime: toInputDateTime(f.depDateTime),
          arrDateTime: toInputDateTime(f.arrDateTime),
          notes: f.notes,
          locators: f.locators.map((l) => ({ id: l.id, code: l.code })),
          passengers: f.passengers.map((fp) => ({
            id: fp.passenger.id,
            name: fp.passenger.name,
            seat: fp.seat,
            locatorId: fp.locatorId,
          })),
        }))}
      />
    </div>
  );
}
