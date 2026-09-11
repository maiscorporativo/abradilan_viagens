"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAssociate } from "@/lib/auth";
import { buildBriefingMessage, protocolOf } from "@/lib/briefing";
import { recordStage, formatMoney } from "@/lib/travel-notify";
import { sendWhatsappText, whatsappLink, whatsappConfigured } from "@/lib/messaging";
import { baseUrl, linhaDiretaPhone } from "@/lib/portal-config";
import {
  loadOwnRequest, sendRequesterCopy, canAssociateEdit, canAssociateCancel,
} from "@/lib/travel-request";
import { readRequestForm } from "@/lib/travel-request-form";

export type EditRequestState = {
  error?: string;
  success?: string;
  fallbackLink?: string;
};

/**
 * Atualiza a solicitação do próprio associado. Só é permitido enquanto o
 * status é NOVO; depois disso o atendente já pode ter cotado com base no que
 * recebeu. Ao salvar, o briefing atualizado é reenviado ao atendente para que
 * os dois lados não fiquem dessincronizados.
 */
export async function updateTravelRequest(
  requestId: string,
  _prev: EditRequestState,
  formData: FormData
): Promise<EditRequestState> {
  const session = await requireAssociate();

  const existing = await loadOwnRequest(requestId, session.associateId);
  if (!existing) return { error: "Solicitação não encontrada." };
  if (!canAssociateEdit(existing.status)) {
    return {
      error:
        "Esta solicitação já está em atendimento e não pode mais ser alterada por aqui. Fale com o atendente pelo WhatsApp.",
    };
  }

  const parsed = readRequestForm(formData, session);
  if ("error" in parsed) return { error: parsed.error };

  const { data, segments, passengers } = parsed;

  // Trechos e passageiros são substituídos por inteiro: é mais simples e mais
  // seguro que tentar casar linhas editadas com as existentes.
  const updated = await db.$transaction(async (tx) => {
    await tx.travelSegment.deleteMany({ where: { requestId } });
    await tx.travelPassenger.deleteMany({ where: { requestId } });
    return tx.travelRequest.update({
      where: { id: requestId },
      data: {
        ...data,
        editedAt: new Date(),
        segments: { create: segments },
        passengers: { create: passengers },
      },
      include: {
        segments: { orderBy: { sortOrder: "asc" } },
        passengers: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  const phone = linhaDiretaPhone();
  if (phone && whatsappConfigured()) {
    const message =
      "*⚠️ SOLICITAÇÃO ALTERADA PELO ASSOCIADO*\n\n" +
      buildBriefingMessage(
        updated,
        `${baseUrl()}/admin/solicitacoes`,
        updated.segments,
        updated.passengers
      );
    const result = await sendWhatsappText({ phone, message });
    await db.travelRequest.update({
      where: { id: requestId },
      data: {
        dispatchLog: result.ok
          ? `Alteração reenviada ao atendente em ${new Date().toISOString()}.`
          : `Alteração não reenviada: ${result.error ?? "erro desconhecido"}`,
      },
    });
  }

  const copy = await sendRequesterCopy(updated);

  revalidatePath("/app");
  revalidatePath(`/app/solicitacoes/${requestId}`);
  return {
    success: "Solicitação atualizada. O atendente foi notificado da alteração.",
    fallbackLink: copy.whatsappLink,
  };
}

/** Cancela a solicitação e avisa o atendente. */
export async function cancelTravelRequest(
  requestId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAssociate();

  const existing = await loadOwnRequest(requestId, session.associateId);
  if (!existing) return { ok: false, error: "Solicitação não encontrada." };
  if (!canAssociateCancel(existing.status)) {
    return { ok: false, error: "Esta solicitação não pode mais ser cancelada." };
  }

  await db.travelRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELADO",
      notes: reason
        ? `${existing.notes}\n\n[Cancelada pelo associado] ${reason}`.trim()
        : existing.notes,
    },
  });

  await recordStage({
    requestId,
    status: "CANCELADO",
    note: reason,
    actorName: session.name,
    actorType: "ASSOCIADO",
  });

  const phone = linhaDiretaPhone();
  if (phone && whatsappConfigured()) {
    await sendWhatsappText({
      phone,
      message:
        `*SOLICITAÇÃO CANCELADA PELO ASSOCIADO*\n\n` +
        `Protocolo: ${requestId.slice(-8).toUpperCase()}\n` +
        `Solicitante: ${existing.requesterName}\n` +
        `Destino: ${existing.destination}\n` +
        (reason ? `Motivo: ${reason}\n` : ""),
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/solicitacoes/${requestId}`);
  return { ok: true };
}

/** Reenvia ao associado a cópia da própria solicitação. */
export async function resendOwnCopy(
  requestId: string
): Promise<{ ok: boolean; detail: string; link?: string }> {
  const session = await requireAssociate();

  const request = await loadOwnRequest(requestId, session.associateId);
  if (!request) return { ok: false, detail: "Solicitação não encontrada." };

  // O reenvio é sempre explícito, mesmo que a cópia automática esteja
  // desligada — foi o associado que pediu agora.
  const copy = await sendRequesterCopy({ ...request, sendCopy: true });
  revalidatePath(`/app/solicitacoes/${requestId}`);
  return { ok: true, detail: copy.log, link: copy.whatsappLink };
}

/** Link wa.me com a cópia, quando a Evolution não está disponível. */
export async function ownCopyLink(requestId: string): Promise<string | null> {
  const session = await requireAssociate();
  const request = await loadOwnRequest(requestId, session.associateId);
  if (!request?.requesterPhone) return null;
  const message = buildBriefingMessage(
    request,
    `${baseUrl()}/app/solicitacoes/${requestId}`,
    request.segments,
    request.passengers
  );
  return whatsappLink(request.requesterPhone, message);
}

/**
 * O associado escolhe uma das opções cotadas. Isso fecha a solicitação e
 * avisa o atendente, que segue para a emissão.
 */
export async function chooseQuote(
  requestId: string,
  quoteId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAssociate();

  const request = await loadOwnRequest(requestId, session.associateId);
  if (!request) return { ok: false, error: "Solicitação não encontrada." };
  if (request.status !== "COTADO") {
    return {
      ok: false,
      error: "Esta solicitação não está aguardando escolha de opção.",
    };
  }

  const quote = await db.travelQuote.findFirst({
    where: { id: quoteId, requestId },
  });
  if (!quote) return { ok: false, error: "Opção não encontrada." };

  await db.travelRequest.update({
    where: { id: requestId },
    data: { status: "FECHADO", chosenQuoteId: quoteId, decidedAt: new Date() },
  });
  await recordStage({
    requestId,
    status: "FECHADO",
    note: `Opção escolhida: ${quote.title}.`,
    actorName: session.name,
    actorType: "ASSOCIADO",
  });

  // O atendente precisa saber na hora — é o gatilho da emissão.
  const phone = linhaDiretaPhone();
  if (phone && whatsappConfigured()) {
    await sendWhatsappText({
      phone,
      message:
        `*✅ OPÇÃO ESCOLHIDA PELO ASSOCIADO*\n\n` +
        `Protocolo: ${protocolOf(requestId)}\n` +
        `Solicitante: ${request.requesterName}\n` +
        `Opção: ${quote.title}\n` +
        `Valor: ${formatMoney(quote.currency, quote.perPaxAmount)} por passageiro ` +
        `(total ${formatMoney(quote.currency, quote.totalAmount)})\n\n` +
        `Pode seguir para a emissão.\n${baseUrl()}/admin/solicitacoes`,
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/solicitacoes/${requestId}`);
  return { ok: true };
}
