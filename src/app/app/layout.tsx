import { requireAssociate } from "@/lib/auth";
import { associateLogout } from "@/app/entrar/actions";
import { AppNav } from "./app-nav";
import { LogOut } from "lucide-react";

export default async function AssociateAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAssociate();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="bg-gradient-to-br from-sun-600 via-sun-500 to-brand-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-abradilan-branco.png"
              alt="ABRADILAN"
              className="h-9 w-auto"
            />
            <div className="border-l border-white/25 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                Área do associado
              </p>
              <h1 className="text-sm font-bold leading-tight">
                {session.companyName || session.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-right text-xs sm:block">
              Olá, <span className="font-bold">{session.name.split(" ")[0]}</span>
            </p>
            <form action={associateLogout}>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </form>
          </div>
        </div>
        <AppNav />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="flex flex-col items-center gap-2 pb-6 text-center text-[11px] text-slate-400">
        <span>Portal ABRADILAN · Associação Brasileira de Distribuição e Logística de Produtos Farmacêuticos</span>
        <span className="flex items-center gap-1.5">
          operado por
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mais.png" alt="Mais Corporativo" className="h-5 w-auto" />
        </span>
      </footer>
    </div>
  );
}
