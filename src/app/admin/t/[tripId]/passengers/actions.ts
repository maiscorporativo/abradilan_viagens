"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { defaultPin, onlyDigits, parseDateInput } from "@/lib/utils";
import {
  saveUpload, deleteUpload, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES,
} from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

function passengerDataFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    cpf: onlyDigits(String(formData.get("cpf") ?? "")),
    rg: String(formData.get("rg") ?? "").trim(),
    birthDate: parseDateInput(String(formData.get("birthDate") ?? "")),
    passportNumber: String(formData.get("passportNumber") ?? "").trim(),
    passportExpiry: parseDateInput(String(formData.get("passportExpiry") ?? "")),
    city: String(formData.get("city") ?? "").trim(),
    uf: String(formData.get("uf") ?? "").trim().toUpperCase(),
    category: String(formData.get("category") ?? "").trim(),
    dietary: String(formData.get("dietary") ?? "").trim(),
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim(),
    emergencyName: String(formData.get("emergencyName") ?? "").trim(),
    emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    rsvpStatus: String(formData.get("rsvpStatus") ?? "PENDENTE"),
    groupId: String(formData.get("groupId") ?? "") || null,
    titularId: String(formData.get("titularId") ?? "") || null,
    type: String(formData.get("type") ?? "TITULAR"),
    blocked: formData.get("blocked") === "on",
  };
}

export async function createPassenger(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const data = passengerDataFromForm(formData);
  if (!data.name) return { error: "Nome é obrigatório." };
  if (data.type === "ACOMPANHANTE" && !data.titularId) {
    return { error: "Selecione o titular do acompanhante." };
  }

  const passenger = await db.passenger.create({
    data: { ...data, tripId, pin: defaultPin(data.cpf) },
  });
  await db.activityLog.create({
    data: {
      tripId,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "passenger.create",
      details: data.name,
    },
  });
  revalidatePath(`/admin/t/${tripId}/passengers`);
  redirect(`/admin/t/${tripId}/passengers/${passenger.id}`);
}

export async function updatePassenger(
  tripId: string,
  passengerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const data = passengerDataFromForm(formData);
  if (!data.name) return { error: "Nome é obrigatório." };
  if (data.titularId === passengerId) data.titularId = null;

  /* Quando o CPF é preenchido ou corrigido, o PIN precisa acompanhar:
     passageiro cadastrado sem CPF recebe PIN aleatório, e sem isso ele
     ficaria com esse PIN para sempre, contrariando a regra de que o
     acesso é CPF + CPF. Quem já escolheu o próprio PIN fica intocado. */
  const antes = await db.passenger.findUnique({
    where: { id: passengerId },
    select: { cpf: true, pinCustom: true },
  });
  const cpfMudou = onlyDigits(antes?.cpf ?? "") !== data.cpf;
  const realinharPin = antes && !antes.pinCustom && cpfMudou && data.cpf.length === 11;

  await db.passenger.update({
    where: { id: passengerId },
    data: realinharPin ? { ...data, pin: defaultPin(data.cpf) } : data,
  });
  await db.activityLog.create({
    data: {
      tripId,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "passenger.update",
      details: data.name,
    },
  });
  revalidatePath(`/admin/t/${tripId}/passengers`, "layout");
  return { ok: true };
}

export async function deletePassenger(tripId: string, passengerId: string) {
  const session = await requireTripWriter(tripId);
  const docs = await db.passengerDocument.findMany({ where: { passengerId } });
  const p = await db.passenger.delete({ where: { id: passengerId } });
  await Promise.all(docs.map((d) => deleteUpload(d.filePath)));
  await db.activityLog.create({
    data: {
      tripId,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "passenger.delete",
      details: p.name,
    },
  });
  redirect(`/admin/t/${tripId}/passengers`);
}

/**
 * Redefine o PIN do passageiro para o CPF (ou um PIN aleatório, se não houver
 * CPF). Usado quando o passageiro perde o PIN que ele mesmo escolheu.
 */
export async function regeneratePin(tripId: string, passengerId: string) {
  await requireTripWriter(tripId);
  const passenger = await db.passenger.findUnique({
    where: { id: passengerId },
    select: { cpf: true },
  });
  await db.passenger.update({
    where: { id: passengerId },
    data: { pin: defaultPin(passenger?.cpf), pinCustom: false },
  });
  revalidatePath(`/admin/t/${tripId}/passengers/${passengerId}`);
}

/**
 * Define PIN = CPF para os passageiros da viagem que ainda não escolheram um
 * PIN próprio. Quem já trocou o PIN no portal (pinCustom) não é afetado.
 */
export async function generateMissingPins(tripId: string) {
  await requireTripWriter(tripId);
  const targets = await db.passenger.findMany({
    where: { tripId, pinCustom: false },
    select: { id: true, cpf: true, pin: true },
  });
  for (const p of targets) {
    const pin = defaultPin(p.cpf);
    // sem CPF, só preenche quando não há PIN (não troca um já entregue)
    if (!onlyDigits(p.cpf) && p.pin) continue;
    if (p.pin === pin) continue;
    await db.passenger.update({ where: { id: p.id }, data: { pin } });
  }
  revalidatePath(`/admin/t/${tripId}/passengers`);
}

export async function uploadPassengerDocument(
  tripId: string,
  passengerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "OUTRO");
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
    `trips/${tripId}/passengers/${passengerId}`,
    file.name,
    Buffer.from(await file.arrayBuffer())
  );
  await db.passengerDocument.create({
    data: {
      passengerId,
      kind,
      fileName: file.name,
      filePath: saved.filePath,
      mimeType: file.type,
      size: saved.size,
      uploadedBy: session.name,
    },
  });
  revalidatePath(`/admin/t/${tripId}/passengers/${passengerId}`);
  return { ok: true };
}

export async function deletePassengerDocument(
  tripId: string,
  passengerId: string,
  documentId: string
) {
  await requireTripWriter(tripId);
  const doc = await db.passengerDocument.delete({ where: { id: documentId } });
  await deleteUpload(doc.filePath);
  revalidatePath(`/admin/t/${tripId}/passengers/${passengerId}`);
}
