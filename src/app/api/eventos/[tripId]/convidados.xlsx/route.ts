import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/session";
import { canAccessTrip } from "@/lib/auth";
import { INVITE_KINDS, INVITE_STATUS } from "@/lib/constants";
import { formatDateTimeBR } from "@/lib/utils";

/**
 * Exportação da lista de convidados em XLSX (porte de src/relatorios-xlsx.js).
 * Três abas: convidados, empresas com cotas e resumo de presença.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!(await canAccessTrip(session, tripId))) {
    return NextResponse.json({ error: "Sem acesso a este evento" }, { status: 403 });
  }

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { name: true, invitesEnabled: true, individualPool: true },
  });
  if (!trip?.invitesEnabled) {
    return NextResponse.json({ error: "Evento sem módulo de convites" }, { status: 404 });
  }

  const [invites, companies] = await Promise.all([
    db.invite.findMany({
      where: { tripId },
      orderBy: { name: "asc" },
      include: {
        company: { select: { companyName: true } },
        table: { select: { number: true } },
      },
    }),
    db.eventCompany.findMany({
      where: { tripId },
      orderBy: { companyName: "asc" },
      include: {
        invites: { where: { status: { not: "CANCELADO" } }, select: { id: true } },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      invites.map((i) => ({
        Nome: i.name,
        Cargo: i.role,
        Empresa: i.company?.companyName ?? "Convite individual",
        Tipo: INVITE_KINDS[i.kind] ?? i.kind,
        "E-mail": i.email,
        Telefone: i.phone,
        Mesa: i.table?.number ?? "",
        Cadeira: i.seat ?? "",
        Código: i.code,
        Status: INVITE_STATUS[i.status] ?? i.status,
        "Confirmado em": i.confirmedAt ? formatDateTimeBR(i.confirmedAt) : "",
        "Credenciado em": i.checkedInAt ? formatDateTimeBR(i.checkedInAt) : "",
      }))
    ),
    "Convidados"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      companies.map((c) => ({
        Empresa: c.companyName,
        Responsável: c.contactName,
        "E-mail": c.email,
        Telefone: c.phone,
        Login: c.login,
        Cota: c.quota,
        Usados: c.invites.length,
        Saldo: c.quota - c.invites.length,
      }))
    ),
    "Empresas"
  );

  const active = invites.filter((i) => i.status !== "CANCELADO");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Indicador: "Convidados ativos", Valor: active.length },
      {
        Indicador: "Presença confirmada",
        Valor: active.filter((i) =>
          ["CONFIRMADO", "CREDENCIADO"].includes(i.status)
        ).length,
      },
      {
        Indicador: "Credenciados",
        Valor: active.filter((i) => i.status === "CREDENCIADO").length,
      },
      {
        Indicador: "Cancelados",
        Valor: invites.length - active.length,
      },
      { Indicador: "Pool de convites individuais", Valor: trip.individualPool },
    ]),
    "Resumo"
  );

  const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `convidados-${tripId}.xlsx`;

  return new NextResponse(new Blob([new Uint8Array(buffer)]), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
