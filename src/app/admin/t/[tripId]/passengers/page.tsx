import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { RSVP_STATUS } from "@/lib/constants";
import { calcAge, formatCpf, formatDateBR } from "@/lib/utils";
import {
  Badge, EmptyState, PageHeader, Table, Td, Th,
} from "@/components/ui";
import { statusTone } from "@/lib/status";
import { generateMissingPins } from "./actions";
import { PassengerFilters } from "./passenger-filters";
import { KeyRound, Plus, Users, Baby, AlertTriangle } from "lucide-react";
import type { Prisma } from "@prisma/client";

export default async function PassengersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;
  const sp = await searchParams;

  const where: Prisma.PassengerWhereInput = { tripId };
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q } },
      { email: { contains: sp.q } },
      { cpf: { contains: sp.q.replace(/\D/g, "") || sp.q } },
      { passportNumber: { contains: sp.q } },
    ];
  }
  if (sp.type) where.type = sp.type;
  if (sp.status) where.rsvpStatus = sp.status;
  if (sp.group) where.groupId = sp.group;
  if (sp.uf) where.uf = sp.uf;
  if (sp.category) where.category = sp.category;
  if (sp.dietary === "1") where.dietary = { not: "" };
  if (sp.blocked === "1") where.blocked = true;

  const [passengers, groups, categories, all] = await Promise.all([
    db.passenger.findMany({
      where,
      orderBy: { name: "asc" },
      include: { group: true, titular: { select: { name: true } } },
    }),
    db.tripGroup.findMany({ where: { tripId }, orderBy: { name: "asc" } }),
    db.passenger.findMany({
      where: { tripId, category: { not: "" } },
      select: { category: true },
      distinct: ["category"],
    }),
    db.passenger.findMany({
      where: { tripId },
      select: { rsvpStatus: true, type: true, birthDate: true, dietary: true },
    }),
  ]);

  const confirmed = all.filter((p) => p.rsvpStatus === "CONFIRMADO").length;
  const underage = all.filter((p) => {
    const a = calcAge(p.birthDate);
    return a !== null && a < 18;
  }).length;
  const withDietary = all.filter((p) => p.dietary).length;

  const writer = canWrite(session.role);

  return (
    <div>
      <PageHeader
        title="Passageiros"
        subtitle={`${all.length} cadastrados · ${confirmed} confirmados · ${underage} menores de idade · ${withDietary} com restrição alimentar`}
        actions={
          writer && (
            <div className="flex gap-2">
              <form action={generateMissingPins.bind(null, tripId)}>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  title="Define o PIN do portal como o CPF de cada passageiro. Quem já trocou o PIN não é afetado."
                >
                  <KeyRound className="h-4 w-4" /> PIN = CPF
                </button>
              </form>
              <Link
                href={`/admin/t/${tripId}/passengers/new`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
              >
                <Plus className="h-4 w-4" /> Novo passageiro
              </Link>
            </div>
          )
        }
      />

      <PassengerFilters
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        categories={categories.map((c) => c.category)}
      />

      {passengers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Nenhum passageiro encontrado"
          description="Cadastre manualmente ou envie o link do formulário do convidado (em Configurações)."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Tipo</Th>
              <Th>CPF</Th>
              <Th>Nascimento</Th>
              <Th>Cidade/UF</Th>
              <Th>Categoria</Th>
              <Th>Grupo</Th>
              <Th>RSVP</Th>
              <Th>Alertas</Th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((p) => {
              const age = calcAge(p.birthDate);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td className="font-medium">
                    <Link
                      href={`/admin/t/${tripId}/passengers/${p.id}`}
                      className="text-slate-900 hover:text-brand-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.type === "ACOMPANHANTE" && p.titular && (
                      <p className="text-[11px] text-slate-400">
                        Acompanhante de {p.titular.name}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={p.type === "TITULAR" ? "teal" : "violet"}>
                      {p.type === "TITULAR" ? "Titular" : "Acompanhante"}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs">{p.cpf ? formatCpf(p.cpf) : "—"}</Td>
                  <Td>
                    {formatDateBR(p.birthDate)}
                    {age !== null && (
                      <span className="ml-1 text-xs text-slate-400">({age})</span>
                    )}
                  </Td>
                  <Td>{[p.city, p.uf].filter(Boolean).join("/") || "—"}</Td>
                  <Td>{p.category || "—"}</Td>
                  <Td>
                    {p.group ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.group.color }}
                        />
                        {p.group.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <Badge tone={statusTone(p.rsvpStatus)}>
                      {RSVP_STATUS[p.rsvpStatus] ?? p.rsvpStatus}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      {age !== null && age < 18 && (
                        <span title="Menor de idade">
                          <Baby className="h-4 w-4 text-amber-600" />
                        </span>
                      )}
                      {p.dietary && (
                        <span title={`Restrição: ${p.dietary}`}>
                          <AlertTriangle className="h-4 w-4 text-rose-500" />
                        </span>
                      )}
                      {p.blocked && <Badge tone="rose">Bloqueado</Badge>}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
