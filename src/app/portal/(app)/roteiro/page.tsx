import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { CalendarClock, MapPin } from "lucide-react";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function dateLabel(d: Date | null) {
  if (!d) return "A definir";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} — ${WEEKDAYS[d.getUTCDay()]}`;
}

export default async function RoteiroPage() {
  const session = await requirePassenger();
  const items = await db.itineraryItem.findMany({
    where: {
      tripId: session.tripId,
      audience: "TODOS",
      status: { not: "CANCELADO" },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { sortOrder: "asc" }],
  });

  const byDate = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.date ? item.date.toISOString().slice(0, 10) : "";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  }

  return (
    <div>
      <h2 className="mb-4 text-base font-bold text-slate-900">Roteiro da viagem</h2>
      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-10 w-10" />}
          title="Roteiro em preparação"
          description="A organização ainda está montando o day-by-day da viagem."
        />
      ) : (
        <div className="space-y-8">
          {[...byDate.entries()].map(([key, dayItems]) => (
            <section key={key || "no-date"}>
              <h3 className="mb-3 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide text-brand-800">
                {dateLabel(dayItems[0].date)}
              </h3>
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
                {dayItems.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-white bg-ember-500" />
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold text-brand-700">
                        {item.startTime || "—"}
                        {item.endTime && ` – ${item.endTime}`}
                        {item.timezone && (
                          <span className="ml-1 font-normal text-slate-400">
                            ({item.timezone})
                          </span>
                        )}
                      </p>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      {item.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" /> {item.location}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
