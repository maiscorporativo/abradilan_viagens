import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess } from "@/lib/auth";
import { TRIP_STATUS } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { statusTone } from "@/lib/status";
import { TripNav } from "./trip-nav";
import { ArrowLeft } from "lucide-react";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireTripAccess(tripId);
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      primaryColor: true,
      destination: true,
      kind: true,
      invitesEnabled: true,
      tablesEnabled: true,
    },
  });
  if (!trip) notFound();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-60">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Todas as viagens
        </Link>
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          style={{ borderTopColor: trip.primaryColor, borderTopWidth: 3 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {trip.clientName}
          </p>
          <h2 className="text-sm font-bold text-slate-900">{trip.name}</h2>
          {trip.destination && (
            <p className="mt-0.5 text-xs text-slate-500">{trip.destination}</p>
          )}
          <div className="mt-2">
            <Badge tone={statusTone(trip.status)}>
              {TRIP_STATUS[trip.status] ?? trip.status}
            </Badge>
          </div>
        </div>
        <TripNav
          tripId={trip.id}
          invitesEnabled={trip.invitesEnabled}
          tablesEnabled={trip.tablesEnabled}
        />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
