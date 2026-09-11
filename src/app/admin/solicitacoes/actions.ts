"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { buildBriefingMessage } from "@/lib/briefing";
import { sendWhatsappText, whatsappLink } from "@/lib/messaging";
import { baseUrl, linhaDiretaPhone } from "@/lib/portal-config";
import { TRAVEL_REQUEST_STATUS } from "@/lib/constants";

export async function updateRequestStatus(requestId: string, status: string) {
  const session = await requireStaff();
  if (!canWrite(session.role)) throw new Error("Sem permissão para esta ação.");
  if (!(status in TRAVEL_REQUEST_STATUS)) throw new Error("Status inválido.");

  await db.travelRequest.update({
    where: { id: requestId },
    data: {
      status,
      handledBy: status === "NOVO" ? "" : session.name,
    },
  });
  await db.activityLog.create({
    data: {
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "travel_request.status",
      details: `${requestId} → ${status}`,
    },
  });
  revalidatePath("/admin/solicitacoes");
}

/** Reenvia o briefing ao atendente — útil quando o disparo original falhou. */
export async function resendBriefing(
  requestId: string
): Promise<{ ok: boolean; error?: string; link?: string }> {
  const session = await requireStaff();
  if (!canWrite(session.role)) throw new Error("Sem permissão para esta ação.");

  const request = await db.travelRequest.findUnique({
    where: { id: requestId },
    include: { segments: true, passengers: true },
  });
  if (!request) return { ok: false, error: "Solicitação não encontrada." };

  const phone = linhaDiretaPhone();
  if (!phone) {
    return { ok: false, error: "LINHA_DIRETA_WHATSAPP não configurado no .env." };
  }

  const message = buildBriefingMessage(
    request,
    `${baseUrl()}/admin/solicitacoes`,
    request.segments,
    request.passengers
  );
  const result = await sendWhatsappText({ phone, message });

  await db.travelRequest.update({
    where: { id: requestId },
    data: {
      dispatchLog: result.ok
        ? `Reenviado por ${session.name} em ${new Date().toISOString()}.`
        : `Reenvio falhou: ${result.error ?? "erro desconhecido"}`,
    },
  });
  revalidatePath("/admin/solicitacoes");

  if (result.ok) return { ok: true };
  // Sem Evolution disponível, devolve o link para envio manual.
  return { ok: false, error: result.error, link: whatsappLink(phone, message) ?? undefined };
}
