import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import { CalendarDays, Hotel, MapPin, Phone } from "lucide-react";

export default async function HospedagemPage() {
  const session = await requirePassenger();
  const links = await db.accommodationPassenger.findMany({
    where: { passengerId: session.passengerId },
    include: { accommodation: true },
  });

  return (
    <div>
      <h2 className="mb-4 text-base font-bold text-slate-900">Minha hospedagem</h2>
      {links.length === 0 ? (
        <EmptyState
          icon={<Hotel className="h-10 w-10" />}
          title="Hospedagem ainda não atribuída"
          description="Assim que a organização definir seu hotel e quarto, as informações aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {links.map(({ accommodation: h, roomNumber, roomType }) => (
            <Card key={h.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {[h.address, h.city, h.country].filter(Boolean).join(" · ")}
                    </p>
                    {h.phone && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3.5 w-3.5" /> {h.phone}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Check-in {formatDateBR(h.checkIn)} · Check-out {formatDateBR(h.checkOut)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {roomNumber && <Badge tone="teal">Quarto {roomNumber}</Badge>}
                    {roomType && <Badge tone="slate">{roomType}</Badge>}
                  </div>
                </div>
                {h.notes && <p className="mt-2 text-xs text-slate-500">{h.notes}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
