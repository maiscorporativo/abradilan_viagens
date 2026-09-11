"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { parseDateInput } from "@/lib/utils";

export type ActionState = { error?: string; ok?: boolean };

function itemFromForm(formData: FormData) {
  return {
    subject: String(formData.get("subject") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    responsible: String(formData.get("responsible") ?? "").trim(),
    startDate: parseDateInput(String(formData.get("startDate") ?? "")),
    endDate: parseDateInput(String(formData.get("endDate") ?? "")),
    status: String(formData.get("status") ?? "PENDENTE"),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function appendHistory(history: string, actor: string, entry: string) {
  const stamp = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return `${history ? history + "\n" : ""}[${stamp}] ${actor}: ${entry}`;
}

export async function createChecklistItem(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const data = itemFromForm(formData);
  if (!data.subject) return { error: "Descreva a tarefa." };
  await db.checklistItem.create({
    data: {
      ...data,
      tripId,
      history: appendHistory("", session.name, "Tarefa criada"),
    },
  });
  revalidatePath(`/admin/t/${tripId}/checklist`);
  return { ok: true };
}

export async function updateChecklistItem(
  tripId: string,
  itemId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const data = itemFromForm(formData);
  if (!data.subject) return { error: "Descreva a tarefa." };
  const current = await db.checklistItem.findUnique({ where: { id: itemId } });
  if (!current) return { error: "Tarefa não encontrada." };

  const changes: string[] = [];
  if (current.status !== data.status) changes.push(`status → ${data.status}`);
  if (current.responsible !== data.responsible) {
    changes.push(`responsável → ${data.responsible || "—"}`);
  }

  await db.checklistItem.update({
    where: { id: itemId },
    data: {
      ...data,
      history: changes.length
        ? appendHistory(current.history, session.name, changes.join("; "))
        : current.history,
    },
  });
  revalidatePath(`/admin/t/${tripId}/checklist`);
  return { ok: true };
}

export async function setChecklistStatus(
  tripId: string,
  itemId: string,
  status: string
) {
  const session = await requireTripWriter(tripId);
  const current = await db.checklistItem.findUnique({ where: { id: itemId } });
  if (!current) return;
  await db.checklistItem.update({
    where: { id: itemId },
    data: {
      status,
      history: appendHistory(current.history, session.name, `status → ${status}`),
    },
  });
  revalidatePath(`/admin/t/${tripId}/checklist`);
}

export async function deleteChecklistItem(tripId: string, itemId: string) {
  await requireTripWriter(tripId);
  await db.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/t/${tripId}/checklist`);
}
