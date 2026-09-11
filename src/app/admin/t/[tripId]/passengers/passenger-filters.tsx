"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, Select, Button } from "@/components/ui";
import { RSVP_STATUS, UFS } from "@/lib/constants";
import { Search, XCircle } from "lucide-react";
import { useCallback, useRef } from "react";

export function PassengerFilters({
  groups,
  categories,
}: {
  groups: { id: string; name: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const onSearch = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value), 350);
  };

  const hasFilters = [...searchParams.keys()].length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, CPF, e-mail ou passaporte…"
          className="pl-9"
        />
      </div>

      <Select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
        className="w-auto"
      >
        <option value="">Tipo: todos</option>
        <option value="TITULAR">Titulares</option>
        <option value="ACOMPANHANTE">Acompanhantes</option>
      </Select>

      <Select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="w-auto"
      >
        <option value="">RSVP: todos</option>
        {Object.entries(RSVP_STATUS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>

      <Select
        value={searchParams.get("group") ?? ""}
        onChange={(e) => setParam("group", e.target.value)}
        className="w-auto"
      >
        <option value="">Grupo: todos</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </Select>

      <Select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="w-auto"
      >
        <option value="">Categoria: todas</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>

      <Select
        value={searchParams.get("uf") ?? ""}
        onChange={(e) => setParam("uf", e.target.value)}
        className="w-auto"
      >
        <option value="">UF: todas</option>
        {UFS.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </Select>

      <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={searchParams.get("dietary") === "1"}
          onChange={(e) => setParam("dietary", e.target.checked ? "1" : "")}
        />
        Com restrição alimentar
      </label>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
          <XCircle className="h-3.5 w-3.5" /> Limpar
        </Button>
      )}
    </div>
  );
}
