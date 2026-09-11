import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/utils";
import { ArrowRight, Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";

export default async function VoosPage() {
  const session = await requirePassenger();
  const links = await db.flightPassenger.findMany({
    where: { passengerId: session.passengerId },
    include: { flight: true, locator: true },
  });

  const flights = links
    .map((l) => ({
      ...l.flight,
      seat: l.seat,
      ticketNumber: l.ticketNumber,
      // localizador do próprio passageiro; sem ele, o padrão do voo
      locator: l.locator?.code || l.flight.locator,
    }))
    .sort(
      (a, b) => (a.depDateTime?.getTime() ?? 0) - (b.depDateTime?.getTime() ?? 0)
    );

  return (
    <div>
      <h2 className="mb-4 text-base font-bold text-slate-900">Meus voos</h2>
      {flights.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-10 w-10" />}
          title="Nenhum voo atribuído ainda"
          description="Assim que a organização emitir seus bilhetes, os voos aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {flights.map((f) => (
            <Card key={f.id}>
              <CardBody className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex w-36 items-center gap-3">
                    {f.airlineCode && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/airline-logo/${f.airlineCode}`}
                        alt=""
                        className="h-9 w-9 rounded object-contain"
                      />
                    )}
                    <div>
                      <p className="font-mono text-base font-bold text-slate-900">
                        {f.flightNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {f.airlineName || f.airlineCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{f.originIata}</p>
                      <p className="max-w-40 truncate text-[11px] text-slate-500">
                        {f.originName}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600">
                        <PlaneTakeoff className="h-3 w-3" />
                        {formatDateTimeBR(f.depDateTime)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-ember-500" />
                    <div>
                      <p className="text-xl font-bold text-slate-900">{f.destIata}</p>
                      <p className="max-w-40 truncate text-[11px] text-slate-500">
                        {f.destName}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <PlaneLanding className="h-3 w-3" />
                        {formatDateTimeBR(f.arrDateTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {f.seat && <Badge tone="teal">Assento {f.seat}</Badge>}
                    {f.locator && (
                      <Badge tone="slate" className="font-mono">LOC {f.locator}</Badge>
                    )}
                  </div>
                </div>
                {f.operatedBy && (
                  <p className="mt-2 rounded-lg bg-sun-100 px-3 py-1.5 text-xs font-semibold text-brand-800">
                    ✈ Este voo é comercializado pela {f.airlineName || f.airlineCode} e
                    operado pela {f.operatedBy}.
                  </p>
                )}
                {f.notes && <p className="mt-2 text-xs text-slate-500">{f.notes}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
