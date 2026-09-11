"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAssociate } from "@/lib/auth";
import { buildBriefingMessage } from "@/lib/briefing";
import { sendWhatsappText, whatsappLink, whatsappConfigured } from "@/lib/messaging";
import {
  linhaDiretaPhone, linhaDiretaConfigured, baseUrl,
} from "@/lib/portal-config";
import { readRequestForm } from "@/lib/travel-request-form";
import { sendRequesterCopy } from "@/lib/travel-request";
import { recordStage } from "@/lib/travel-notify";

export type TravelRequestState = {
  error?: string;
  success?: string;
  /** Preenchido quando a Evolution não está configurada: o associado envia
   *  o briefing pelo próprio WhatsApp, com a mensagem já pronta. */
  fallbackLink?: string;
  /** Link wa.me da cópia, quando ela não pôde ser enviada automaticamente. */
  copyLink?: string;
  /** Id da solicitação criada, para o link de acompanhamento. */
  requestId?: string;
};

export async function submitTravelRequest(
  _prev: TravelRequestState,
  formData: FormData
): Promise<TravelRequestState> {
  const session = await requireAssociate();

  const parsed = readRequestForm(formData, session);
  if ("error" in parsed) return { error: parsed.error };
  const { data, segments, passengers } = parsed;

  const request = await db.travelRequest.create({
    data: {
      ...data,
      associateId: session.associateId,
      segments: { create: segments },
      passengers: { create: passengers },
    },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      passengers: { orderBy: { sortOrder: "asc" } },
    },
  });

  await recordStage({
    requestId: request.id,
    status: "NOVO",
    actorName: request.requesterName,
    actorType: "ASSOCIADO",
  });

  const message = buildBriefingMessage(
    request,
    `${baseUrl()}/admin/solicitacoes`,
    request.segments,
    request.passengers
  );
  const phone = linhaDiretaPhone();

  // A cópia ao solicitante é independente do disparo ao atendente: falhar aqui
  // nunca invalida a solicitação.
  const copy = await sendRequesterCopy(request);
  const base: TravelRequestState = {
    requestId: request.id,
    copyLink: copy.whatsappLink,
  };

  if (!linhaDiretaConfigured()) {
    await db.travelRequest.update({
      where: { id: request.id },
      data: {
        dispatchLog:
          "WhatsApp do atendente não configurado (LINHA_DIRETA_WHATSAPP). Solicitação registrada; tratar por /admin/solicitacoes.",
      },
    });
    revalidatePath("/app");
    return {
      ...base,
      success:
        "Solicitação registrada. Nossa equipe entrará em contato — o disparo automático ao atendente ainda não está configurado.",
    };
  }

  // Com a Evolution configurada o envio é automático; sem ela, devolvemos o
  // link wa.me com a mensagem pronta (mesmo fallback do sistema de convites).
  if (whatsappConfigured()) {
    const result = await sendWhatsappText({ phone, message });
    await db.travelRequest.update({
      where: { id: request.id },
      data: {
        dispatchLog: result.ok
          ? `Enviado ao atendente ${phone} via Evolution.`
          : `Falha no envio automático: ${result.error ?? "erro desconhecido"}`,
      },
    });
    if (result.ok) {
      revalidatePath("/app");
      return {
        ...base,
        success:
          "Briefing enviado ao atendente dedicado. Você receberá o retorno em breve.",
      };
    }
    return {
      ...base,
      success:
        "Solicitação registrada, mas o envio automático falhou. Use o botão abaixo para enviar pelo seu WhatsApp.",
      fallbackLink: whatsappLink(phone, message) ?? undefined,
    };
  }

  await db.travelRequest.update({
    where: { id: request.id },
    data: { dispatchLog: "Link wa.me gerado para envio manual." },
  });
  revalidatePath("/app");
  return {
    ...base,
    success: "Solicitação registrada. Toque no botão abaixo para enviar ao atendente.",
    fallbackLink: whatsappLink(phone, message) ?? undefined,
  };
}
