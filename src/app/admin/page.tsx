import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, canWrite, accessibleTripsWhere } from "@/lib/auth";
import { TRIP_STATUS } from "@/lib/constants";
import { formatDateBR } from "@/lib/utils";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { statusTone } from "@/lib/status";
import { CalendarDays, MapPin, Plus, Users, Plane } from "lucide-react";

export default async function AdminHome() {
  const session = await requireStaff();
  const trips = await db.trip.findMany({
    where: await accessibleTripsWhere(session),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { passengers: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Viagens de incentivo"
        subtitle="Selecione uma viagem para gerenciar ou crie uma nova."
        actions={
          canWrite(session.role) && (
            <Link
              href="/admin/trips/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
            >
              <Plus className="h-4 w-4" /> Nova viagem
            </Link>
          )
        }
      />

      {trips.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-10 w-10" />}
          title="Nenhuma viagem cadastrada"
          description="Crie a primeira viagem de incentivo para começar a cadastrar passageiros, voos e cronogramas."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/admin/t/${trip.id}`}>
              <Card className="h-full transition hover:border-brand-400 hover:shadow-md">
                <CardBody>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
                        {trip.clientName}
                      </p>
                      <h2 className="text-base font-bold text-slate-900">{trip.name}</h2>
                    </div>
                    <Badge tone={statusTone(trip.status)}>
                      {TRIP_STATUS[trip.status] ?? trip.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                    {trip.destination && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateBR(trip.startDate)} — {formatDateBR(trip.endDate)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> {trip._count.passengers}{" "}
                      passageiro(s)
                    </p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
