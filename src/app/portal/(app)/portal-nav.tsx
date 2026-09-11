"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, User, Plane, Hotel, FolderOpen, LifeBuoy, CalendarClock,
} from "lucide-react";

const items = [
  { href: "/portal", label: "Início", icon: Home },
  { href: "/portal/roteiro", label: "Roteiro", icon: CalendarClock },
  { href: "/portal/voos", label: "Voos", icon: Plane },
  { href: "/portal/hospedagem", label: "Hospedagem", icon: Hotel },
  { href: "/portal/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/portal/suporte", label: "Suporte", icon: LifeBuoy },
  { href: "/portal/dados", label: "Meus dados", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
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
