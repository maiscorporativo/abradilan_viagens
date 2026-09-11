import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { staffLogout } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/constants";
import { LogOut, Users, Building2, Headset } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="flex items-center">
            <Image
              src="/logo-abradilan.png"
              alt="Portal ABRADILAN"
              width={372}
              height={102}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/solicitacoes"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Headset className="h-3.5 w-3.5" /> Linha direta
            </Link>
            {session.role === "MASTER" && (
              <Link
                href="/admin/associates"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Building2 className="h-3.5 w-3.5" /> Associados
              </Link>
            )}
            {session.role === "MASTER" && (
              <Link
                href="/admin/users"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Users className="h-3.5 w-3.5" /> Usuários
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">{session.name}</p>
              <p className="text-[11px] text-slate-400">
                {ROLE_LABELS[session.role] ?? session.role}
              </p>
            </div>
            <form action={staffLogout}>
              <button
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
