import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { passengerLogout } from "@/app/portal/login/actions";
import { PortalNav } from "./portal-nav";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePassenger();
  const passenger = await db.passenger.findUnique({
    where: { id: session.passengerId },
    include: { trip: true },
  });
  if (!passenger || passenger.blocked) redirect("/portal/login");
  const trip = passenger.trip;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header
        className="text-white"
        style={{
          background: `linear-gradient(135deg, ${trip.primaryColor}, #001225)`,
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {trip.logoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/trip-logo/${trip.id}`}
                alt={trip.clientName}
                className="h-10 w-auto rounded bg-white/90 p-1"
              />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {trip.clientName}
              </p>
              <h1 className="text-sm font-bold leading-tight">{trip.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-right text-xs sm:block">
              Olá, <span className="font-bold">{passenger.name.split(" ")[0]}</span>
            </p>
            <form action={passengerLogout}>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </form>
          </div>
        </div>
        <PortalNav />
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
      <footer className="flex flex-col items-center gap-2 pb-6 text-center text-[11px] text-slate-400">
        <span>Portal do passageiro · {trip.clientName}</span>
        <span className="flex items-center gap-1.5">
          operado por
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mais.png" alt="Mais Corporativo" className="h-5 w-auto" />
        </span>
      </footer>
    </div>
  );
}
