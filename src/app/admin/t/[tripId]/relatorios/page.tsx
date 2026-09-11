import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripAccess } from "@/lib/auth";
import { Card, CardBody, PageHeader } from "@/components/ui";
import {
  Users, ClipboardCheck, Building2, LayoutGrid, CheckCheck, Tags,
  FileSpreadsheet, ArrowRight,
} from "lucide-react";

const reports = [
  {
    slug: "convidados",
    title: "Lista geral de convidados",
    description: "Todos os convidados do evento, com empresa, contato e status.",
    icon: Users,
  },
  {
    slug: "credenciamento",
    title: "Lista de credenciamento",
    description: "Lista impressa com campo de assinatura para a recepção.",
    icon: ClipboardCheck,
  },
  {
    slug: "empresas",
    title: "Relatório por empresa",
    description: "Cotas contratadas × convites utilizados por empresa.",
    icon: Building2,
  },
  {
    slug: "mesas",
    title: "Mapa de mesas com ocupação",
    description: "Cada mesa com seus ocupantes e cadeiras.",
    icon: LayoutGrid,
  },
  {
    slug: "presenca",
    title: "Relatório de presença",
    description: "Confirmados × credenciados, com horário de entrada.",
    icon: CheckCheck,
  },
  {
    slug: "etiquetas",
    title: "Etiquetas / credenciais",
    description: "Crachás com nome, empresa, mesa e QR code para impressão.",
    icon: Tags,
  },
];

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { invitesEnabled: true },
  });
  if (!trip?.invitesEnabled) notFound();

  return (
    <>
      <PageHeader
        title="Relatórios do evento"
        subtitle="Abrem em página otimizada para impressão — use “Imprimir / Salvar PDF” do navegador."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map(({ slug, title, description, icon: Icon }) => (
          <Link key={slug} href={`/admin/t/${tripId}/relatorios/${slug}`} target="_blank">
            <Card className="group h-full transition-shadow hover:shadow-md">
              <CardBody className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </CardBody>
            </Card>
          </Link>
        ))}

        <a href={`/api/eventos/${tripId}/convidados.xlsx`}>
          <Card className="group h-full transition-shadow hover:shadow-md">
            <CardBody className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Planilha de convidados (XLSX)
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Exportação completa para Excel, com abas de convidados, empresas
                  e presença.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
            </CardBody>
          </Card>
        </a>
      </div>
    </>
  );
}
