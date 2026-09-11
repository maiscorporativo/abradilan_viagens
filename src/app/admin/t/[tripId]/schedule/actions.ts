"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { parseDateInput } from "@/lib/utils";

export type ActionState = { error?: string; ok?: boolean };

function itemFromForm(formData: FormData) {
  return {
    date: parseDateInput(String(formData.get("date") ?? "")),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    responsible: String(formData.get("responsible") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    status: String(formData.get("status") ?? "PENDENTE"),
    audience: String(formData.get("audience") ?? "TODOS"),
  };
}

export async function createItineraryItem(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = itemFromForm(formData);
  if (!data.title) return { error: "Descreva a atividade." };
  const last = await db.itineraryItem.findFirst({
    where: { tripId },
    orderBy: { sortOrder: "desc" },
  });
  await db.itineraryItem.create({
    data: { ...data, tripId, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  revalidatePath(`/admin/t/${tripId}/schedule`);
  return { ok: true };
}

export async function updateItineraryItem(
  tripId: string,
  itemId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = itemFromForm(formData);
  if (!data.title) return { error: "Descreva a atividade." };
  await db.itineraryItem.update({ where: { id: itemId }, data });
  revalidatePath(`/admin/t/${tripId}/schedule`);
  return { ok: true };
}

export async function setItineraryStatus(
  tripId: string,
  itemId: string,
  status: string
) {
  await requireTripWriter(tripId);
  await db.itineraryItem.update({ where: { id: itemId }, data: { status } });
  revalidatePath(`/admin/t/${tripId}/schedule`);
}

export async function deleteItineraryItem(tripId: string, itemId: string) {
  await requireTripWriter(tripId);
  await db.itineraryItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/t/${tripId}/schedule`);
}
