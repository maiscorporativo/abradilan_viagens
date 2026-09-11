import "server-only";
import type { TravelRequest, TravelQuote } from "@prisma/client";
import { db } from "./db";
import { trackUrlOf } from "./travel-request";
import { protocolOf } from "./briefing";
import { CURRENCIES, STAGE_DESCRIPTION, TRAVEL_REQUEST_STATUS } from "./constants";
import { formatDateBR } from "./utils";
import {
  sendEmailText, sendWhatsappText, emailConfigured, whatsappConfigured,
} from "./messaging";

// ---------------------------------------------------------------------------
// Avisos ao associado a cada mudança de etapa da solicitação.
// Nada aqui pode derrubar a operação do atendente: uma falha de envio é
// registrada em `copyLog` e a transição de etapa segue valendo.
// ---------------------------------------------------------------------------

export function formatMoney(currency: string, amount: number) {
  const symbol = CURRENCIES[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Registra a etapa no histórico — é ele que alimenta a régua visual. */
export async function recordStage(opts: {
  requestId: string;
  status: string;
  note?: string;
  actorName: string;
  actorType: "STAFF" | "ASSOCIADO" | "SISTEMA";
}) {
  await db.travelRequestEvent.create({
    data: {
      requestId: opts.requestId,
      status: opts.status,
      note: opts.note ?? "",
      actorName: opts.actorName,
      actorType: opts.actorType,
    },
  });
}

function stageText(r: TravelRequest, quotes: TravelQuote[]): string {
  const url = trackUrlOf(r.id);
  const linhas: string[] = [
    `*Sua solicitação de viagem — ${TRAVEL_REQUEST_STATUS[r.status] ?? r.status}*`,
    "",
    `Olá, ${r.requesterName.split(" ")[0]}!`,
    STAGE_DESCRIPTION[r.status] ?? "",
    "",
    `*Protocolo:* ${protocolOf(r.id)}`,
    r.destination ? `*Destino:* ${r.destination}` : "",
  ];

  if (r.status === "COTADO" && quotes.length > 0) {
    linhas.push("", `*${quotes.length} opção(ões) para você comparar:*`);
    for (const [i, q] of quotes.entries()) {
      linhas.push(
        `${i + 1}. ${q.title} — ${formatMoney(q.currency, q.perPaxAmount)} por passageiro` +
          (q.validUntil ? ` (válida até ${formatDateBR(q.validUntil)})` : "")
      );
    }
    linhas.push("", "Escolha a sua opção aqui:");
  } else {
    linhas.push("", "Acompanhe pela sua área do associado:");
  }

  linhas.push(url);
  return linhas.filter((l) => l !== "").join("\n");
}

function stageHtml(r: TravelRequest, quotes: TravelQuote[]): string {
  const url = trackUrlOf(r.id);
  const esc = (v: string) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const cotacoes =
    r.status === "COTADO" && quotes.length > 0
      ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0f2836;border-bottom:1px solid #d9e2ee;padding-bottom:6px;margin:0 0 12px;">Opções para comparar</h3>
      ${quotes
        .map(
          (q) => `<table role="presentation" width="100%" style="border:1px solid #d9e2ee;border-radius:8px;margin-bottom:10px;" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 16px;">
            <div style="font-size:15px;font-weight:700;color:#101828;">${esc(q.title)}</div>
            ${q.description ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(q.description)}</div>` : ""}
            <div style="font-size:15px;color:#1690d0;font-weight:700;margin-top:8px;">${formatMoney(q.currency, q.perPaxAmount)} <span style="font-size:12px;color:#64748b;font-weight:400;">por passageiro</span></div>
            <div style="font-size:12px;color:#64748b;">Total: ${formatMoney(q.currency, q.totalAmount)}${q.validUntil ? ` · válida até ${formatDateBR(q.validUntil)}` : ""}</div>
          </td></tr></table>`
        )
        .join("")}`
      : "";

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#101828;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr><td style="background:#0f2836;padding:30px;text-align:center;">
    <div style="color:#1690d0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Linha direta de viagens</div>
    <div style="color:#eef4fb;font-size:22px;font-weight:700;margin-top:8px;">${esc(TRAVEL_REQUEST_STATUS[r.status] ?? r.status)}</div>
    <div style="color:#9db3cc;font-size:13px;margin-top:6px;">Protocolo ${protocolOf(r.id)}</div>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:16px;margin:0 0 12px;">Olá, <strong>${esc(r.requesterName.split(" ")[0])}</strong>!</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${esc(STAGE_DESCRIPTION[r.status] ?? "")}</p>
    ${cotacoes}
    <p style="text-align:center;margin:24px 0 0;">
      <a href="${url}" style="display:inline-block;background-color:#1690d0;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-size:15px;font-weight:bold;">${
        r.status === "COTADO" ? "Escolher a minha opção" : "Acompanhar solicitação"
      }</a>
    </p>
  </td></tr>
  <tr><td style="background:#f6f8fb;border-top:1px solid #d9e2ee;padding:18px;text-align:center;font-size:12px;color:#8ba0b8;">
    Portal ABRADILAN · linha direta de viagens
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * Avisa o associado que a etapa mudou. Em COTADO a mensagem já traz o resumo
 * das opções, porque é a etapa que exige decisão dele.
 */
export async function notifyStageChange(requestId: string): Promise<string> {
  const request = await db.travelRequest.findUnique({
    where: { id: requestId },
    include: { quotes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!request) return "Solicitação não encontrada.";

  const text = stageText(request, request.quotes);
  const partes: string[] = [];

  if (request.requesterEmail && emailConfigured()) {
    const sent = await sendEmailText({
      to: request.requesterEmail,
      subject: `Solicitação ${protocolOf(request.id)} — ${
        TRAVEL_REQUEST_STATUS[request.status] ?? request.status
      }`,
      text,
      html: stageHtml(request, request.quotes),
    });
    partes.push(sent.ok ? "aviso por e-mail enviado" : `e-mail falhou: ${sent.error}`);
  }

  if (request.requesterPhone && whatsappConfigured()) {
    const sent = await sendWhatsappText({
      phone: request.requesterPhone,
      message: text,
    });
    partes.push(
      sent.ok ? "aviso por WhatsApp enviado" : `WhatsApp falhou: ${sent.error}`
    );
  }

  const log = partes.length > 0 ? partes.join(" · ") : "nenhum canal disponível";
  return `[${TRAVEL_REQUEST_STATUS[request.status] ?? request.status}] ${log}`;
}
