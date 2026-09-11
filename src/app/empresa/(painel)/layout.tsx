import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { companyLogout } from "@/app/empresa/login/actions";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

export default async function CompanyPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCompany();
  const company = await db.eventCompany.findUnique({
    where: { id: session.companyId },
    include: { trip: { select: { name: true, primaryColor: true, secondaryColor: true } } },
  });
  if (!company) redirect("/empresa/login");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header
        className="text-white"
        style={{
          background: `linear-gradient(135deg, ${company.trip.secondaryColor}, ${company.trip.primaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-abradilan-branco.png" alt="ABRADILAN" className="h-8 w-auto" />
            <div className="border-l border-white/25 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                {company.trip.name}
              </p>
              <h1 className="text-sm font-bold leading-tight">{company.companyName}</h1>
            </div>
          </div>
          <form action={companyLogout}>
            <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>

      <footer className="flex flex-col items-center gap-2 pb-6 text-center text-[11px] text-slate-400">
        <span>Convites do evento · Portal ABRADILAN</span>
        <span className="flex items-center gap-1.5">
          operado por
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mais.png" alt="Mais Corporativo" className="h-5 w-auto" />
        </span>
      </footer>
    </div>
  );
}
