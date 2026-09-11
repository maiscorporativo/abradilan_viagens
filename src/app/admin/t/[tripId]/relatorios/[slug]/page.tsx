import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireTripAccess } from "@/lib/auth";
import { baseUrl } from "@/lib/portal-config";
import { inviteLink } from "@/lib/invite-messages";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { INVITE_STATUS } from "@/lib/constants";
import { PrintShell } from "./print-shell";

export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  convidados: "Lista geral de convidados",
  credenciamento: "Lista de credenciamento",
  empresas: "Cotas por empresa",
  mesas: "Mapa de mesas — ocupação",
  presenca: "Relatório de presença",
  etiquetas: "Etiquetas / credenciais",
};

const th = "border-b-2 border-slate-300 px-2 py-1.5 text-left text-xs font-bold uppercase";
const td = "border-b border-slate-200 px-2 py-1.5 align-top";

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ tripId: string; slug: string }>;
}) {
  const { tripId, slug } = await params;
  await requireTripAccess(tripId);
  if (!(slug in TITLES)) notFound();

  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip?.invitesEnabled) notFound();

  const invites = await db.invite.findMany({
    where: { tripId, status: { not: "CANCELADO" } },
    orderBy: { name: "asc" },
    include: {
      company: { select: { companyName: true } },
      table: { select: { number: true } },
    },
  });

  const subtitle = [
    trip.name,
    trip.startDate ? formatDateBR(trip.startDate) : "",
    trip.venueName,
  ]
    .filter(Boolean)
    .join(" · ");

  const letterhead = trip.letterheadPath
    ? `/api/files/trip-letterhead/${tripId}`
    : null;

  const seatOf = (i: (typeof invites)[number]) =>
    i.table?.number != null
      ? `Mesa ${i.table.number}${i.seat != null ? ` / cad. ${i.seat}` : ""}`
      : "—";

  // ---------------------------------------------------------------- etiquetas
  if (slug === "etiquetas") {
    const base = baseUrl();
    const withQr = await Promise.all(
      invites.map(async (i) => ({
        invite: i,
        qr: await QRCode.toDataURL(inviteLink(base, i.token), {
          width: 200,
          margin: 0,
        }),
      }))
    );
    return (
      <PrintShell
        title={TITLES[slug]}
        subtitle={subtitle}
        letterheadSrc={letterhead}
      >
        <div className="grid grid-cols-2 gap-3">
          {withQr.map(({ invite, qr }) => (
            <div
              key={invite.id}
              className="avoid-break flex items-center gap-3 rounded-lg border border-slate-300 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" width={72} height={72} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{invite.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {invite.company?.companyName || "Convite individual"}
                </p>
                <p className="text-xs font-semibold">{seatOf(invite)}</p>
                {invite.code && (
                  <p className="font-mono text-[10px] text-slate-400">#{invite.code}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </PrintShell>
    );
  }

  // ---------------------------------------------------------------- empresas
  if (slug === "empresas") {
    const companies = await db.eventCompany.findMany({
      where: { tripId },
      orderBy: { companyName: "asc" },
      include: {
        invites: { where: { status: { not: "CANCELADO" } }, select: { id: true } },
      },
    });
    return (
      <PrintShell title={TITLES[slug]} subtitle={subtitle} letterheadSrc={letterhead}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Empresa</th>
              <th className={th}>Responsável</th>
              <th className={th}>Cota</th>
              <th className={th}>Usados</th>
              <th className={th}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td className={td}>{c.companyName}</td>
                <td className={td}>{c.contactName || "—"}</td>
                <td className={td}>{c.quota}</td>
                <td className={td}>{c.invites.length}</td>
                <td className={td}>{c.quota - c.invites.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm">
          Pool de convites individuais disponível: <strong>{trip.individualPool}</strong>
        </p>
      </PrintShell>
    );
  }

  // ---------------------------------------------------------------- mesas
  if (slug === "mesas") {
    const tables = await db.eventTable.findMany({
      where: { tripId },
      orderBy: { number: "asc" },
      include: {
        invites: {
          where: { status: { not: "CANCELADO" } },
          orderBy: { seat: "asc" },
          include: { company: { select: { companyName: true } } },
        },
      },
    });
    return (
      <PrintShell title={TITLES[slug]} subtitle={subtitle} letterheadSrc={letterhead}>
        <div className="space-y-4">
          {tables.map((t) => (
            <div key={t.id} className="avoid-break">
              <h2 className="border-b border-slate-300 pb-1 text-sm font-bold">
                Mesa {t.number}
                {t.name ? ` — ${t.name}` : ""}{" "}
                <span className="font-normal text-slate-500">
                  ({t.invites.length}/{t.capacity})
                </span>
              </h2>
              {t.invites.length === 0 ? (
                <p className="py-1 text-sm text-slate-400">Mesa livre.</p>
              ) : (
                <ol className="py-1 text-sm">
                  {t.invites.map((i) => (
                    <li key={i.id}>
                      {i.seat ? `${i.seat}. ` : "• "}
                      {i.name}
                      {i.company?.companyName ? ` — ${i.company.companyName}` : ""}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
          {tables.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma mesa cadastrada.</p>
          )}
        </div>
      </PrintShell>
    );
  }

  // ------------------------------------------- convidados / credenciamento / presença
  const showSignature = slug === "credenciamento";
  const showPresence = slug === "presenca";

  return (
    <PrintShell title={TITLES[slug]} subtitle={subtitle} letterheadSrc={letterhead}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Convidado</th>
            <th className={th}>Empresa</th>
            <th className={th}>Lugar</th>
            {!showSignature && <th className={th}>Status</th>}
            {showPresence && <th className={th}>Credenciado em</th>}
            {slug === "convidados" && <th className={th}>Contato</th>}
            {showSignature && <th className={th}>Assinatura</th>}
          </tr>
        </thead>
        <tbody>
          {invites.map((i) => (
            <tr key={i.id}>
              <td className={td}>
                {i.name}
                {i.role && <span className="block text-xs text-slate-500">{i.role}</span>}
              </td>
              <td className={td}>{i.company?.companyName || "Individual"}</td>
              <td className={td}>{seatOf(i)}</td>
              {!showSignature && (
                <td className={td}>{INVITE_STATUS[i.status] ?? i.status}</td>
              )}
              {showPresence && (
                <td className={td}>
                  {i.checkedInAt ? formatDateTimeBR(i.checkedInAt) : "—"}
                </td>
              )}
              {slug === "convidados" && (
                <td className={td}>
                  {i.email}
                  {i.phone && <span className="block text-xs">{i.phone}</span>}
                </td>
              )}
              {showSignature && <td className={td} style={{ height: 34 }} />}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-sm text-slate-600">
        Total: <strong>{invites.length}</strong> convidado(s)
        {showPresence && (
          <>
            {" · "}credenciados:{" "}
            <strong>{invites.filter((i) => i.status === "CREDENCIADO").length}</strong>
            {" · "}confirmados sem comparecer:{" "}
            <strong>{invites.filter((i) => i.status === "CONFIRMADO").length}</strong>
          </>
        )}
      </p>
    </PrintShell>
  );
}
