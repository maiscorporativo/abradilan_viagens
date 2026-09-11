import type { Invite, Trip, EventTable } from "@prisma/client";
import { formatDateBR } from "./utils";

// ---------------------------------------------------------------------------
// Montagem das mensagens de convite (WhatsApp e e-mail).
// Porte de src/mensagens.js do sistema de convites, com a identidade ABRADILAN
// e os campos de personalização por evento (título, texto, rodapé, modelo de
// WhatsApp com {{placeholders}} e mensagem de cancelamento).
// ---------------------------------------------------------------------------

export type InviteWithTable = Invite & { table?: EventTable | null };

export type Credentials = { login: string; password: string };

type Hotel = { nome?: string; endereco?: string; telefone?: string; distancia?: string };
type Facility = { titulo?: string; descricao?: string };

export function inviteLink(base: string, token: string) {
  return `${base}/convite/${token}`;
}

/**
 * Link de confirmação em 1 clique. A confirmação em si só acontece via JS ao
 * carregar a página — nunca pela requisição GET — para que scanners de
 * segurança de e-mail que pré-carregam links não confirmem presenças sozinhos.
 */
export function confirmLink(base: string, token: string) {
  return `${inviteLink(base, token)}?confirmar=1`;
}

function parseJsonArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function hotelsOf(trip: Trip) {
  return parseJsonArray<Hotel>(trip.hotels);
}

export function facilitiesOf(trip: Trip) {
  return parseJsonArray<Facility>(trip.facilities);
}

/** "Mesa 4, Cadeira 2" — vazio quando o mapa de mesas está desativado. */
export function seatInfo(invite: InviteWithTable, trip: Trip): string | null {
  if (!trip.tablesEnabled) return null;
  const number = invite.table?.number;
  if (number != null && invite.seat != null) return `Mesa ${number}, Cadeira ${invite.seat}`;
  if (number != null) return `Mesa ${number}`;
  return null;
}

export function eventDateLabel(trip: Trip) {
  return trip.startDate ? formatDateBR(trip.startDate) : "";
}

export function mapsUrl(trip: Trip) {
  const query = `${trip.venueName} ${trip.venueAddress}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ---------------------------------------------------------------- placeholders

function placeholderValues(
  trip: Trip,
  invite: InviteWithTable,
  base: string
): Record<string, string> {
  return {
    nome: invite.name,
    evento: trip.name,
    data: eventDateLabel(trip),
    hora: trip.eventTime,
    local: trip.venueName,
    endereco: trip.venueAddress,
    traje: trip.dressCode,
    mesa: seatInfo(invite, trip) ?? "",
    link: inviteLink(base, invite.token),
    codigo: invite.code,
  };
}

function applyPlaceholders(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => values[key] ?? "");
}

function hotelsBlock(trip: Trip) {
  const hotels = hotelsOf(trip);
  if (hotels.length === 0) return "";
  const lines = hotels
    .map(
      (h) =>
        `• ${h.nome ?? ""}${h.distancia ? ` (${h.distancia})` : ""}` +
        `${h.endereco ? ` — ${h.endereco}` : ""}${h.telefone ? ` — ${h.telefone}` : ""}`
    )
    .join("\n");
  return `\n🏨 *Hotéis próximos:*\n${lines}\n`;
}

// ---------------------------------------------------------------- WhatsApp

export function inviteText(
  trip: Trip,
  invite: InviteWithTable,
  base: string,
  credentials?: Credentials | null
): string {
  const seat = seatInfo(invite, trip);
  const template = trip.whatsappTemplate.trim();
  let msg: string;

  if (template) {
    // Modelo personalizado pelo organizador. O link do convite é garantido
    // mesmo que o modelo não o inclua — sem ele não há credenciamento.
    const values = placeholderValues(trip, invite, base);
    msg = applyPlaceholders(template, values).trim() + "\n";
    if (!msg.includes(values.link)) {
      msg += `\n🎫 *Seu convite digital com QR code:*\n${values.link}\n`;
      msg += `\nApresente o QR code na recepção para o credenciamento.\n`;
    }
  } else {
    msg = `🥂 *Convite — ${trip.name}*\n\n`;
    msg += `Olá, *${invite.name}*!\n\n`;
    msg += `${trip.emailText || `Você está convidado(a) para o *${trip.name}*.`}\n\n`;
    if (trip.startDate) {
      msg += `📅 *Data:* ${eventDateLabel(trip)}${trip.eventTime ? ` às ${trip.eventTime}` : ""}\n`;
    }
    if (trip.venueName) {
      msg += `📍 *Local:* ${trip.venueName}${trip.venueAddress ? ` — ${trip.venueAddress}` : ""}\n`;
    }
    if (trip.dressCode) msg += `👔 *Traje:* ${trip.dressCode}\n`;
    if (seat) msg += `🪑 *Seu lugar:* ${seat}\n`;
    msg += `\n🎫 *Seu convite digital com QR code:*\n${inviteLink(base, invite.token)}\n`;
    msg += `\nApresente o QR code na recepção para o credenciamento.\n`;
  }

  msg += hotelsBlock(trip);

  if (credentials) {
    msg += `\n🔐 *Seu acesso à plataforma* (para gerenciar os convites da sua empresa):\n`;
    msg += `Link: ${base}/empresa/login\n`;
    msg += `Login: ${credentials.login}\n`;
    msg += `Senha: ${credentials.password}\n`;
  }

  msg += `\nAguardamos você!`;
  return msg;
}

// ---------------------------------------------------------------- E-mail

/** Escapa texto vindo do cadastro antes de interpolar no HTML do e-mail. */
function esc(v: string) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteHtml(opts: {
  trip: Trip;
  invite: InviteWithTable;
  base: string;
  qrDataUrl?: string | null;
  bannerDataUrl?: string | null;
  credentials?: Credentials | null;
}): string {
  const { trip, invite, base, qrDataUrl, bannerDataUrl, credentials } = opts;
  const seat = seatInfo(invite, trip);
  const canConfirm = !["CONFIRMADO", "CREDENCIADO", "CANCELADO"].includes(invite.status);
  const hotels = hotelsOf(trip);
  const facilities = facilitiesOf(trip);

  const title = esc(trip.emailTitle || trip.name);
  const opening = esc(
    trip.emailText ||
      trip.description ||
      "Temos o prazer de convidá-lo(a) para este evento especial."
  );
  const footer = esc(trip.emailFooter || `Convite pessoal e intransferível · ${trip.name}`);
  const primary = trip.primaryColor || "#1690d0";
  const secondary = trip.secondaryColor || "#0f2836";

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#101828;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  ${bannerDataUrl ? `<tr><td><img src="${bannerDataUrl}" alt="" width="600" style="display:block;width:100%;height:auto;"></td></tr>` : ""}
  <tr><td style="background:${secondary};padding:${bannerDataUrl ? "26px 32px" : "40px 32px"};text-align:center;">
    <div style="color:${primary};font-size:13px;letter-spacing:4px;text-transform:uppercase;">Convite</div>
    <div style="color:#eef4fb;font-size:30px;font-weight:700;margin-top:10px;">${title}</div>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <p style="font-size:17px;margin:0 0 16px;">Olá, <strong>${esc(invite.name)}</strong>!</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${opening}</p>
    <table role="presentation" width="100%" style="background:#f6f8fb;border:1px solid #d9e2ee;border-radius:10px;" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 24px;font-size:15px;line-height:2;">
      ${trip.startDate ? `📅 <strong>Data:</strong> ${eventDateLabel(trip)}${trip.eventTime ? ` às ${esc(trip.eventTime)}` : ""}<br>` : ""}
      ${trip.venueName ? `📍 <strong>Local:</strong> ${esc(trip.venueName)}${trip.venueAddress ? ` — ${esc(trip.venueAddress)}` : ""}<br>` : ""}
      ${trip.dressCode ? `👔 <strong>Traje:</strong> ${esc(trip.dressCode)}<br>` : ""}
      ${seat ? `🪑 <strong>Seu lugar:</strong> ${esc(seat)}<br>` : ""}
      🗺️ <a href="${mapsUrl(trip)}" style="color:${primary};">Ver no mapa</a>
    </td></tr></table>
    <div style="text-align:center;padding:28px 0 8px;">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR code do convite" width="180" height="180" style="border:1px solid #d9e2ee;border-radius:8px;">` : ""}
      <p style="font-size:13px;color:#64748b;margin:12px 0 0;">Apresente este QR code na recepção para o credenciamento.</p>
      ${
        canConfirm
          ? `<p style="margin:22px 0 0;"><a href="${confirmLink(base, invite.token)}" style="display:inline-block;background-color:${primary};color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:8px;font-size:16px;font-weight:bold;">✅ Confirmar minha presença</a></p>`
          : `<p style="margin:22px 0 0;font-size:14px;color:#15803d;font-weight:bold;">✅ ${invite.status === "CREDENCIADO" ? "Presença já registrada no evento." : "Presença confirmada. Até lá!"}</p>`
      }
      <p style="margin:14px 0 0;"><a href="${inviteLink(base, invite.token)}" style="display:inline-block;background-color:${secondary};color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;">Abrir meu convite digital</a></p>
    </div>
    ${
      hotels.length
        ? `<h3 style="font-size:15px;color:${secondary};border-bottom:1px solid #d9e2ee;padding-bottom:6px;margin:28px 0 12px;">🏨 Hotéis próximos</h3>
    <ul style="font-size:14px;line-height:1.8;padding-left:18px;margin:0;">${hotels
      .map(
        (h) =>
          `<li><strong>${esc(h.nome ?? "")}</strong>${h.distancia ? ` (${esc(h.distancia)})` : ""}${h.endereco ? ` — ${esc(h.endereco)}` : ""}${h.telefone ? ` — ${esc(h.telefone)}` : ""}</li>`
      )
      .join("")}</ul>`
        : ""
    }
    ${
      facilities.length
        ? `<h3 style="font-size:15px;color:${secondary};border-bottom:1px solid #d9e2ee;padding-bottom:6px;margin:28px 0 12px;">✨ Comodidades</h3>
    <ul style="font-size:14px;line-height:1.8;padding-left:18px;margin:0;">${facilities
      .map((f) => `<li><strong>${esc(f.titulo ?? "")}:</strong> ${esc(f.descricao ?? "")}</li>`)
      .join("")}</ul>`
        : ""
    }
    ${
      credentials
        ? `<table role="presentation" width="100%" style="background:${secondary};border-radius:10px;margin-top:28px;" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 24px;color:#eef4fb;font-size:14px;line-height:2;">
      🔐 <strong style="color:${primary};">Seu acesso à plataforma</strong> — gerencie os convites da sua empresa:<br>
      Link: <a href="${base}/empresa/login" style="color:${primary};">${base}/empresa/login</a><br>
      Login: <strong>${esc(credentials.login)}</strong> &nbsp;|&nbsp; Senha: <strong>${esc(credentials.password)}</strong>
    </td></tr></table>`
        : ""
    }
  </td></tr>
  <tr><td style="background:#f6f8fb;border-top:1px solid #d9e2ee;padding:18px;text-align:center;font-size:12px;color:#8ba0b8;">
    ${footer}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------- Cancelamento

const DEFAULT_CANCEL_TEMPLATE = `Prezado(a) {{nome}},

Informamos que o seu convite para o {{evento}}, agendado para {{data}}, foi cancelado por
solicitação do responsável pela sua inscrição.

Agradecemos a atenção e nos colocamos à disposição para qualquer esclarecimento.

Atenciosamente,
{{evento}}`;

export function cancelText(trip: Trip, invite: InviteWithTable, base: string) {
  const template = trip.cancelTemplate.trim() || DEFAULT_CANCEL_TEMPLATE;
  return applyPlaceholders(template, placeholderValues(trip, invite, base));
}

export function cancelHtml(trip: Trip, invite: InviteWithTable, base: string) {
  const text = esc(cancelText(trip, invite, base));
  const secondary = trip.secondaryColor || "#0f2836";
  const primary = trip.primaryColor || "#1690d0";
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#101828;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr><td style="background:${secondary};padding:32px;text-align:center;">
    <div style="color:${primary};font-size:12px;letter-spacing:3px;text-transform:uppercase;">Aviso</div>
    <div style="color:#eef4fb;font-size:22px;font-weight:700;margin-top:8px;">Cancelamento de convite</div>
  </td></tr>
  <tr><td style="padding:36px 40px;font-size:15px;line-height:1.7;white-space:pre-line;">${text}</td></tr>
  <tr><td style="background:#f6f8fb;border-top:1px solid #d9e2ee;padding:18px;text-align:center;font-size:12px;color:#8ba0b8;">
    ${esc(trip.name)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
