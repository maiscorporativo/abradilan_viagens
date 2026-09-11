"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";

export type ActionState = { error?: string; ok?: boolean };

function postFromForm(formData: FormData) {
  const targetType = String(formData.get("targetType") ?? "TODOS");
  return {
    title: String(formData.get("title") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    targetType,
    targetValue:
      targetType === "TODOS" ? "" : String(formData.get("targetValue") ?? ""),
    urgent: formData.get("urgent") === "on",
    active: formData.get("active") !== "off" && formData.get("active") !== null
      ? formData.get("active") === "on"
      : true,
  };
}

export async function createMuralPost(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const data = postFromForm(formData);
  if (!data.title || !data.message) {
    return { error: "Título e mensagem são obrigatórios." };
  }
  await db.muralPost.create({
    data: { ...data, tripId, author: session.name },
  });
  revalidatePath(`/admin/t/${tripId}/mural`);
  return { ok: true };
}

export async function updateMuralPost(
  tripId: string,
  postId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = postFromForm(formData);
  if (!data.title || !data.message) {
    return { error: "Título e mensagem são obrigatórios." };
  }
  await db.muralPost.update({ where: { id: postId }, data });
  revalidatePath(`/admin/t/${tripId}/mural`);
  return { ok: true };
}

export async function toggleMuralPost(tripId: string, postId: string) {
  await requireTripWriter(tripId);
  const post = await db.muralPost.findUnique({ where: { id: postId } });
  if (!post) return;
  await db.muralPost.update({
    where: { id: postId },
    data: { active: !post.active },
  });
  revalidatePath(`/admin/t/${tripId}/mural`);
}

export async function deleteMuralPost(tripId: string, postId: string) {
  await requireTripWriter(tripId);
  await db.muralPost.delete({ where: { id: postId } });
  revalidatePath(`/admin/t/${tripId}/mural`);
}
