"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Plane, Hotel, CalendarClock, ListChecks,
  Megaphone, LifeBuoy, FolderOpen, Ticket, Settings,
  Building2, MailCheck, LayoutGrid, ScanLine, Printer,
} from "lucide-react";

const items = [
  { href: "", label: "Visão geral", icon: LayoutDashboard },
  { href: "/passengers", label: "Passageiros", icon: Users },
  { href: "/flights", label: "Voos", icon: Plane },
  { href: "/hotels", label: "Hospedagens", icon: Hotel },
  { href: "/schedule", label: "Cronograma", icon: CalendarClock },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
  { href: "/mural", label: "Mural de recados", icon: Megaphone },
  { href: "/tickets", label: "Suporte", icon: LifeBuoy },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/settings", label: "Configurações", icon: Settings },
];

// Abas do módulo de convites — exibidas apenas quando o evento tem
// invitesEnabled ligado nas configurações.
const inviteItems = [
  { href: "/companies", label: "Empresas e cotas", icon: Building2 },
  { href: "/invites", label: "Convidados", icon: MailCheck },
  { href: "/tables", label: "Mapa de mesas", icon: LayoutGrid },
  { href: "/credenciamento", label: "Credenciamento", icon: ScanLine },
  { href: "/relatorios", label: "Relatórios", icon: Printer },
];

export function TripNav({
  tripId,
  invitesEnabled = false,
  tablesEnabled = true,
}: {
  tripId: string;
  invitesEnabled?: boolean;
  tablesEnabled?: boolean;
}) {
  const pathname = usePathname();
  const base = `/admin/t/${tripId}`;

  const renderItem = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const full = base + href;
    const active = href === "" ? pathname === base : pathname.startsWith(full);
    return (
      <Link
        key={href}
        href={full}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-brand-50 text-brand-800"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {items.map(renderItem)}

      {invitesEnabled && (
        <>
          <p className="mt-3 border-t border-slate-100 px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Convites do evento
          </p>
          {inviteItems
            .filter((i) => tablesEnabled || i.href !== "/tables")
            .map(renderItem)}
        </>
      )}
    </nav>
  );
}
