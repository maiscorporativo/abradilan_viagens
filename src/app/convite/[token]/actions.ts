"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type RsvpState = { error?: string; status?: string };

/**
 * Confirmação/recusa de presença pelo próprio convidado, a partir do link do
 * convite. O token é o único segredo — não há sessão aqui, por isso nenhuma
 * outra informação do evento é alterável por esta action.
 */
export async function respondToInvite(
  token: string,
  answer: "CONFIRMADO" | "RECUSADO"
): Promise<RsvpState> {
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) return { error: "Convite não encontrado." };
  if (invite.status === "CANCELADO") {
    return { error: "Este convite foi cancelado. Fale com quem o enviou." };
  }
  if (invite.status === "CREDENCIADO") {
    return { status: "CREDENCIADO" };
  }

  await db.invite.update({
    where: { token },
    data: {
      status: answer,
      confirmedAt: answer === "CONFIRMADO" ? new Date() : null,
    },
  });
  await db.activityLog.create({
    data: {
      tripId: invite.tripId,
      actorName: invite.name,
      actorType: "CONVIDADO",
      action: answer === "CONFIRMADO" ? "invite.confirm" : "invite.decline",
    },
  });

  revalidatePath(`/convite/${token}`);
  return { status: answer };
}
