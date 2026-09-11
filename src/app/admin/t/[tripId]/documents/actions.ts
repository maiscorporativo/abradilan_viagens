"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import {
  saveUpload, deleteUpload, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES,
} from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

export async function uploadTripDocument(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "GERAL");
  const passengerId = String(formData.get("passengerId") ?? "") || null;
  const visibleToPassenger = formData.get("visibleToPassenger") === "on";

  if (!title) return { error: "Dê um título ao documento." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return { error: "Formato não permitido. Use PDF, JPG, PNG ou WEBP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Arquivo muito grande (máx. 15 MB)." };
  }

  const saved = await saveUpload(
    `trips/${tripId}/documents`,
    file.name,
    Buffer.from(await file.arrayBuffer())
  );
  await db.tripDocument.create({
    data: {
      tripId,
      passengerId,
      title,
      category,
      fileName: file.name,
      filePath: saved.filePath,
      mimeType: file.type,
      size: saved.size,
      visibleToPassenger,
    },
  });
  await db.activityLog.create({
    data: {
      tripId,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "document.upload",
      details: title,
    },
  });
  revalidatePath(`/admin/t/${tripId}/documents`);
  return { ok: true };
}

export async function deleteTripDocument(tripId: string, documentId: string) {
  await requireTripWriter(tripId);
  const doc = await db.tripDocument.delete({ where: { id: documentId } });
  await deleteUpload(doc.filePath);
  revalidatePath(`/admin/t/${tripId}/documents`);
}
