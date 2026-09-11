"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";

export type ActionState = { error?: string; ok?: boolean };

export async function replyTicket(
  tripId: string,
  ticketId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escreva a resposta." };

  await db.ticketMessage.create({
    data: { ticketId, authorType: "STAFF", authorName: session.name, body },
  });
  await db.ticket.update({
    where: { id: ticketId },
    data: { status: "RESPONDIDO" },
  });
  revalidatePath(`/admin/t/${tripId}/tickets`);
  return { ok: true };
}

export async function setTicketStatus(
  tripId: string,
  ticketId: string,
  status: string
) {
  await requireTripWriter(tripId);
  await db.ticket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath(`/admin/t/${tripId}/tickets`);
}
