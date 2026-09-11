import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateBR } from "@/lib/utils";
import { GuestForm } from "./guest-form";
import { CalendarDays, MapPin } from "lucide-react";

export default async function GuestFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const trip = await db.trip.findUnique({ where: { formToken: token } });
  if (!trip) notFound();

  return (
    <main className="min-h-screen bg-slate-100 pb-16">
      <div
        className="px-4 pb-20 pt-12 text-center text-white"
        style={{
          background: `linear-gradient(135deg, ${trip.primaryColor}, #001225)`,
        }}
      >
        {trip.logoPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/trip-logo/${trip.id}`}
            alt={trip.clientName}
            className="mx-auto mb-4 h-14 w-auto rounded bg-white/90 p-1.5"
          />
        )}
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">
          {trip.clientName}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{trip.name}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm opacity-90">
          {trip.destination && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {trip.destination}
            </span>
          )}
          {trip.startDate && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDateBR(trip.startDate)} — {formatDateBR(trip.endDate)}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-4 pb-4">
        {trip.formOpen ? (
          <GuestForm
            token={token}
            allowCompanion={trip.allowCompanion}
            welcome={trip.formWelcome}
          />
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Inscrições encerradas
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              O período de preenchimento deste formulário foi encerrado. Em caso de
              dúvidas, contate a organização da viagem.
            </p>
          </div>
        )}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          organizado por
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mais.png" alt="Mais Corporativo" className="h-5 w-auto" />
        </p>
      </div>
    </main>
  );
}
