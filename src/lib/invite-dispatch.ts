import "server-only";
import QRCode from "qrcode";
import { db } from "./db";
import { baseUrl } from "./portal-config";
import {
  inviteText, inviteHtml, inviteLink, cancelText, cancelHtml,
  type Credentials,
} from "./invite-messages";
import {
  sendEmailText, sendWhatsappText, whatsappLink,
  emailConfigured, whatsappConfigured,
} from "./messaging";

// ---------------------------------------------------------------------------
// Disparo dos convites por e-mail e WhatsApp.
// Porte de src/envio.js: mantém o comportamento de degradar com elegância —
// sem SMTP o convite é "simulado" (texto pronto na tela) e sem Evolution a
// mensagem vira um link wa.me para envio manual em um clique.
// ---------------------------------------------------------------------------

export type DispatchResult = {
  ok: boolean;
  status: "ENVIADO" | "SIMULADO" | "LINK_GERADO" | "ERRO";
  detail: string;
  /** Link wa.me ou texto pronto, quando o envio depende de ação humana. */
  link?: string;
  message?: string;
};

async function logDelivery(
  inviteId: string,
  channel: "EMAIL" | "WHATSAPP",
  target: string,
  result: DispatchResult
) {
  await db.inviteDelivery.create({
    data: {
      inviteId,
      channel,
      target,
      status: result.status,
      detail: result.detail.slice(0, 500),
    },
  });
  // "Pendente" só até o primeiro disparo; depois o status de RSVP manda.
  if (result.ok) {
    await db.invite.updateMany({
      where: { id: inviteId, status: "PENDENTE" },
      data: { status: "ENVIADO" },
    });
  }
}

async function loadInvite(inviteId: string) {
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    include: { trip: true, table: true, company: true },
  });
  if (!invite) throw new Error("Convite não encontrado.");
  if (!invite.trip.invitesEnabled) {
    throw new Error("O módulo de convites está desativado neste evento.");
  }
  return invite;
}

/**
 * Credenciais de acesso da empresa — só acompanham o convite do RESPONSÁVEL,
 * e apenas enquanto ele não trocou a senha provisória.
 */
function credentialsFor(invite: Awaited<ReturnType<typeof loadInvite>>): Credentials | null {
  if (invite.kind !== "RESPONSAVEL" || !invite.company) return null;
  if (!invite.company.provisionalPassword) return null;
  return {
    login: invite.company.login,
    password: invite.company.provisionalPassword,
  };
}

export async function sendInviteByEmail(inviteId: string): Promise<DispatchResult> {
  const invite = await loadInvite(inviteId);
  const base = baseUrl();

  if (!invite.email) {
    const result: DispatchResult = {
      ok: false,
      status: "ERRO",
      detail: "Convidado sem e-mail cadastrado.",
    };
    await logDelivery(inviteId, "EMAIL", "", result);
    return result;
  }

  const qrDataUrl = await QRCode.toDataURL(inviteLink(base, invite.token), {
    width: 480,
    margin: 1,
  });
  const html = inviteHtml({
    trip: invite.trip,
    invite,
    base,
    qrDataUrl,
    credentials: credentialsFor(invite),
  });
  const text = inviteText(invite.trip, invite, base, credentialsFor(invite));
  const subject = invite.trip.emailTitle || `Convite — ${invite.trip.name}`;

  if (!emailConfigured()) {
    // Modo simulação: devolve a mensagem pronta para envio manual.
    const result: DispatchResult = {
      ok: false,
      status: "SIMULADO",
      detail: "SMTP não configurado — mensagem gerada para envio manual.",
      message: text,
    };
    await logDelivery(inviteId, "EMAIL", invite.email, result);
    return result;
  }

  const sent = await sendEmailText({
    to: invite.email,
    subject,
    text,
    html,
    replyTo: invite.trip.replyTo || undefined,
  });
  const result: DispatchResult = sent.ok
    ? { ok: true, status: "ENVIADO", detail: `Enviado para ${invite.email}.` }
    : { ok: false, status: "ERRO", detail: sent.error ?? "Falha no envio." };
  await logDelivery(inviteId, "EMAIL", invite.email, result);
  return result;
}

export async function sendInviteByWhatsapp(inviteId: string): Promise<DispatchResult> {
  const invite = await loadInvite(inviteId);
  const base = baseUrl();

  if (!invite.phone) {
    const result: DispatchResult = {
      ok: false,
      status: "ERRO",
      detail: "Convidado sem telefone cadastrado.",
    };
    await logDelivery(inviteId, "WHATSAPP", "", result);
    return result;
  }

  const message = inviteText(invite.trip, invite, base, credentialsFor(invite));

  if (!whatsappConfigured()) {
    const link = whatsappLink(invite.phone, message);
    const result: DispatchResult = link
      ? {
          ok: true,
          status: "LINK_GERADO",
          detail: "Evolution não configurada — link wa.me gerado.",
          link,
          message,
        }
      : {
          ok: false,
          status: "ERRO",
          detail: "Telefone inválido para WhatsApp.",
        };
    await logDelivery(inviteId, "WHATSAPP", invite.phone, result);
    return result;
  }

  const sent = await sendWhatsappText({ phone: invite.phone, message });
  const result: DispatchResult = sent.ok
    ? { ok: true, status: "ENVIADO", detail: `Enviado para ${invite.phone}.` }
    : { ok: false, status: "ERRO", detail: sent.error ?? "Falha no envio." };
  await logDelivery(inviteId, "WHATSAPP", invite.phone, result);
  return result;
}

/** Aviso de cancelamento, disparado ao remover um convidado da lista. */
export async function sendCancelNotice(
  inviteId: string
): Promise<{ email: DispatchResult | null; whatsapp: DispatchResult | null }> {
  const invite = await loadInvite(inviteId);
  const base = baseUrl();
  const text = cancelText(invite.trip, invite, base);

  let email: DispatchResult | null = null;
  if (invite.email && emailConfigured()) {
    const sent = await sendEmailText({
      to: invite.email,
      subject: `Cancelamento de convite — ${invite.trip.name}`,
      text,
      html: cancelHtml(invite.trip, invite, base),
      replyTo: invite.trip.replyTo || undefined,
    });
    email = sent.ok
      ? { ok: true, status: "ENVIADO", detail: `Aviso enviado para ${invite.email}.` }
      : { ok: false, status: "ERRO", detail: sent.error ?? "Falha no envio." };
  }

  let whatsapp: DispatchResult | null = null;
  if (invite.phone) {
    if (whatsappConfigured()) {
      const sent = await sendWhatsappText({ phone: invite.phone, message: text });
      whatsapp = sent.ok
        ? { ok: true, status: "ENVIADO", detail: `Aviso enviado para ${invite.phone}.` }
        : { ok: false, status: "ERRO", detail: sent.error ?? "Falha no envio." };
    } else {
      const link = whatsappLink(invite.phone, text);
      if (link) {
        whatsapp = {
          ok: true,
          status: "LINK_GERADO",
          detail: "Link wa.me gerado para envio manual.",
          link,
          message: text,
        };
      }
    }
  }

  return { email, whatsapp };
}
