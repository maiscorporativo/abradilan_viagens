import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { CalendarDays, MapPin, Megaphone, Siren } from "lucide-react";

export default async function PortalHome() {
  const session = await requirePassenger();
  const passenger = await db.passenger.findUnique({
    where: { id: session.passengerId },
    include: { trip: true, group: true },
  });
  if (!passenger) return null;

  const posts = await db.muralPost.findMany({
    where: {
      tripId: passenger.tripId,
      active: true,
      OR: [
        { targetType: "TODOS" },
        ...(passenger.groupId
          ? [{ targetType: "GRUPO", targetValue: passenger.groupId }]
          : []),
        { targetType: "INDIVIDUAL", targetValue: passenger.id },
      ],
    },
    orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
  });

  const trip = passenger.trip;

  return (
    <div className="space-y-6">
      {trip.bannerPath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/files/trip-banner/${trip.id}`}
          alt={`Arte da viagem ${trip.name}`}
          className="w-full rounded-xl shadow-sm"
        />
      )}

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bem-vindo(a), {passenger.name.split(" ")[0]}!
            </h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
              {trip.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                </span>
              )}
              {trip.startDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateBR(trip.startDate)} — {formatDateBR(trip.endDate)}
                </span>
              )}
            </div>
          </div>
          {passenger.group && (
            <Badge className="!px-3 !py-1 !text-xs" tone="teal">
              <span
                className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: passenger.group.color }}
              />
              Grupo {passenger.group.name}
            </Badge>
          )}
        </CardBody>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Megaphone className="h-4 w-4 text-brand-700" /> Recados da organização
        </h3>
        {posts.length === 0 ? (
          <EmptyState
            title="Nenhum recado no momento"
            description="Quando a organização publicar avisos, eles aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <Card
                key={p.id}
                className={p.urgent ? "border-rose-300 bg-rose-50/50" : ""}
              >
                <CardBody className="p-4">
                  <div className="flex items-center gap-2">
                    {p.urgent && (
                      <Badge tone="rose">
                        <Siren className="h-3 w-3" /> Urgente
                      </Badge>
                    )}
                    <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">
                    {p.message}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {formatDateTimeBR(p.createdAt)}
                    {p.author && ` · ${p.author}`}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
