"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, CalendarDays, Headset, KeyRound, ClipboardList } from "lucide-react";

const items = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/eventos", label: "Eventos ABRADILAN", icon: CalendarDays },
  { href: "/app/linha-direta", label: "Linha direta", icon: Headset },
  { href: "/app/solicitacoes", label: "Minhas solicitações", icon: ClipboardList },
  { href: "/app/senha", label: "Minha senha", icon: KeyRound },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors",
              active
                ? "bg-slate-100 text-slate-900"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
