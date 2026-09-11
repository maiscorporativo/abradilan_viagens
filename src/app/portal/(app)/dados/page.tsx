import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { formatCpf, formatDateBR } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui";
import { DadosClient } from "./dados-client";

export default async function DadosPage() {
  const session = await requirePassenger();
  const p = await db.passenger.findUnique({
    where: { id: session.passengerId },
    include: { group: true, titular: { select: { name: true } } },
  });
  if (!p) return null;

  const rows: [string, string][] = [
    ["Nome completo", p.name],
    ["CPF", p.cpf ? formatCpf(p.cpf) : "—"],
    ["RG", p.rg || "—"],
    ["Nascimento", formatDateBR(p.birthDate)],
    ["Passaporte", p.passportNumber || "—"],
    ["Validade do passaporte", formatDateBR(p.passportExpiry)],
    ["Cidade de origem", [p.city, p.uf].filter(Boolean).join("/") || "—"],
    ["Categoria", p.category || "—"],
    ["Grupo", p.group?.name ?? "—"],
    ...(p.titular ? ([["Acompanhante de", p.titular.name]] as [string, string][]) : []),
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-bold text-slate-900">Meus dados</h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="text-sm text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-slate-400">
            Encontrou algum erro nos dados acima? Abra um chamado no Suporte para
            que a organização corrija.
          </p>
        </CardBody>
      </Card>

      <DadosClient
        pinIsCpf={!p.pinCustom}
        contact={{
          email: p.email,
          phone: p.phone,
          emergencyName: p.emergencyName,
          emergencyPhone: p.emergencyPhone,
          dietary: p.dietary,
        }}
      />
    </div>
  );
}
