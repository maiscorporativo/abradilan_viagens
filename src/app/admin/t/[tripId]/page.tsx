import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { calcAge, formatDateTimeBR } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui";
import { DashboardCharts } from "./dashboard-charts";
import {
  Users, UserCheck, Baby, AlertTriangle, LifeBuoy, ListChecks,
} from "lucide-react";

export default async function TripDashboard({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  await requireStaff();
  const { tripId } = await params;

  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) notFound();

  const [passengers, groups, flightLinks, openTickets, pendingTasks, logs] =
    await Promise.all([
      db.passenger.findMany({
        where: { tripId },
        include: { group: true },
      }),
      db.tripGroup.findMany({ where: { tripId } }),
      db.flightPassenger.findMany({
        where: { flight: { tripId } },
        include: { flight: { select: { airlineName: true, airlineCode: true } } },
      }),
      db.ticket.count({ where: { tripId, status: { in: ["NOVO", "EM_ATENDIMENTO"] } } }),
      db.checklistItem.count({ where: { tripId, status: { not: "CONCLUIDO" } } }),
      db.activityLog.findMany({
        where: { tripId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const confirmed = passengers.filter((p) => p.rsvpStatus === "CONFIRMADO").length;
  const companions = passengers.filter((p) => p.type === "ACOMPANHANTE").length;
  const underage = passengers.filter((p) => {
    const a = calcAge(p.birthDate);
    return a !== null && a < 18;
  }).length;
  const dietary = passengers.filter((p) => p.dietary).length;

  // Agregações para os gráficos
  const count = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  const byUf = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byRsvp = new Map<string, number>();
  const byGroup = new Map<string, { value: number; color: string }>();
  const byDay = new Map<string, number>();

  for (const p of passengers) {
    count(byUf, p.uf || "N/I");
    count(byCategory, p.category || "Sem categoria");
    count(byRsvp, p.rsvpStatus);
    if (p.group) {
      const cur = byGroup.get(p.group.name) ?? { value: 0, color: p.group.color };
      cur.value++;
      byGroup.set(p.group.name, cur);
    }
    if (p.formFilledAt) {
      count(byDay, p.formFilledAt.toISOString().slice(0, 10));
    }
  }

  const byAirline = new Map<string, number>();
  const seen = new Set<string>();
  for (const link of flightLinks) {
    const key = `${link.passengerId}|${link.flight.airlineName || link.flight.airlineCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count(byAirline, link.flight.airlineName || link.flight.airlineCode || "N/I");
  }

  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Passageiros", value: passengers.length, icon: Users, href: `/admin/t/${tripId}/passengers` },
    { label: "Confirmados", value: confirmed, icon: UserCheck, href: `/admin/t/${tripId}/passengers?status=CONFIRMADO` },
    { label: "Acompanhantes", value: companions, icon: Users, href: `/admin/t/${tripId}/passengers?type=ACOMPANHANTE` },
    { label: "Menores de idade", value: underage, icon: Baby, href: `/admin/t/${tripId}/passengers` },
    { label: "Restrições alimentares", value: dietary, icon: AlertTriangle, href: `/admin/t/${tripId}/passengers?dietary=1` },
    { label: "Chamados abertos", value: openTickets, icon: LifeBuoy, href: `/admin/t/${tripId}/tickets` },
    { label: "Tarefas pendentes", value: pendingTasks, icon: ListChecks, href: `/admin/t/${tripId}/checklist` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="h-full transition hover:border-brand-400">
              <CardBody className="p-4">
                <Icon className="mb-2 h-4 w-4 text-brand-700" />
                <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <DashboardCharts
        byUf={sortDesc(byUf)}
        byCategory={sortDesc(byCategory)}
        byRsvp={[...byRsvp.entries()].map(([name, value]) => ({ name, value }))}
        byGroup={[...byGroup.entries()].map(([name, v]) => ({
          name,
          value: v.value,
          color: v.color,
        }))}
        byAirline={sortDesc(byAirline)}
        byDay={[...byDay.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, value]) => ({ name, value }))}
      />

      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-bold text-slate-900">Atividade recente</h2>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400">Sem registros ainda.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 font-mono text-slate-400">
                    {formatDateTimeBR(log.createdAt)}
                  </span>
                  <span className="font-semibold text-slate-700">{log.actorName}</span>
                  <span className="text-slate-500">
                    {log.action}
                    {log.details ? ` — ${log.details}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
