"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";

export type ActionState = { error?: string; ok?: boolean };

export async function createTicket(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requirePassenger();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) return { error: "Preencha assunto e mensagem." };

  await db.ticket.create({
    data: {
      tripId: session.tripId,
      passengerId: session.passengerId,
      subject,
      status: "NOVO",
      messages: {
        create: {
          authorType: "PASSAGEIRO",
          authorName: session.name,
          body,
        },
      },
    },
  });
  revalidatePath("/portal/suporte");
  return { ok: true };
}

export async function replyTicketAsPassenger(
  ticketId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requirePassenger();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escreva a mensagem." };

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.passengerId !== session.passengerId) {
    return { error: "Chamado não encontrado." };
  }

  await db.ticketMessage.create({
    data: {
      ticketId,
      authorType: "PASSAGEIRO",
      authorName: session.name,
      body,
    },
  });
  // volta para NOVO para chamar a atenção da equipe
  await db.ticket.update({ where: { id: ticketId }, data: { status: "NOVO" } });
  revalidatePath("/portal/suporte");
  return { ok: true };
}
