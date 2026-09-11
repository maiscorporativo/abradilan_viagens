import "server-only";
import type {
  TravelRequest, TravelSegment, TravelPassenger,
} from "@prisma/client";
import { db } from "./db";
import { baseUrl } from "./portal-config";
import {
  buildRequesterCopyText, buildRequesterCopyHtml, protocolOf,
} from "./briefing";
import {
  sendEmailText, sendWhatsappText, whatsappLink,
  emailConfigured, whatsappConfigured,
} from "./messaging";

export type FullRequest = TravelRequest & {
  segments: TravelSegment[];
  passengers: TravelPassenger[];
};

/** Página onde o associado acompanha a própria solicitação. */
export function trackUrlOf(requestId: string) {
  return `${baseUrl()}/app/solicitacoes/${requestId}`;
}

/**
 * Envia ao próprio solicitante a cópia do que ele pediu, por e-mail e
 * WhatsApp. É comprovante, não notificação operacional: falhar aqui nunca
 * invalida a solicitação — só fica registrado em `copyLog`.
 */
export async function sendRequesterCopy(
  request: FullRequest
): Promise<{ log: string; whatsappLink?: string }> {
  if (!request.sendCopy) {
    return { log: "Cópia ao solicitante desativada no envio." };
  }

  const track = trackUrlOf(request.id);
  const text = buildRequesterCopyText(
    request,
    track,
    request.segments,
    request.passengers
  );
  const partes: string[] = [];
  let link: string | undefined;

  if (request.requesterEmail) {
    if (emailConfigured()) {
      const sent = await sendEmailText({
        to: request.requesterEmail,
        subject: `Sua solicitação de viagem — protocolo ${protocolOf(request.id)}`,
        text,
        html: buildRequesterCopyHtml(
          request,
          track,
          request.segments,
          request.passengers
        ),
      });
      partes.push(
        sent.ok
          ? `E-mail enviado para ${request.requesterEmail}.`
          : `E-mail falhou: ${sent.error ?? "erro desconhecido"}`
      );
    } else {
      partes.push("E-mail não enviado: SMTP não configurado.");
    }
  } else {
    partes.push("Sem e-mail do solicitante.");
  }

  if (request.requesterPhone) {
    if (whatsappConfigured()) {
      const sent = await sendWhatsappText({
        phone: request.requesterPhone,
        message: text,
      });
      partes.push(
        sent.ok
          ? `WhatsApp enviado para ${request.requesterPhone}.`
          : `WhatsApp falhou: ${sent.error ?? "erro desconhecido"}`
      );
    } else {
      // Sem Evolution, devolvemos o link para o próprio associado se enviar.
      link = whatsappLink(request.requesterPhone, text) ?? undefined;
      partes.push("WhatsApp: link gerado para envio manual.");
    }
  } else {
    partes.push("Sem telefone do solicitante.");
  }

  const log = partes.join(" ");
  await db.travelRequest.update({
    where: { id: request.id },
    data: { copyLog: log },
  });

  return { log, whatsappLink: link };
}

/** Carrega a solicitação completa, garantindo que ela é do associado logado. */
export async function loadOwnRequest(requestId: string, associateId: string) {
  return db.travelRequest.findFirst({
    where: { id: requestId, associateId },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      passengers: { orderBy: { sortOrder: "asc" } },
      quotes: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

/**
 * O associado só altera enquanto ninguém assumiu o atendimento — depois disso
 * o atendente já pode ter cotado com base no que recebeu, e uma edição
 * silenciosa dessincronizaria os dois lados.
 */
export function canAssociateEdit(status: string) {
  return status === "NOVO";
}

export function canAssociateCancel(status: string) {
  return !["FECHADO", "CANCELADO"].includes(status);
}
