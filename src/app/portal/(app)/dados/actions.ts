"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";

export type ActionState = { error?: string; ok?: boolean };

export async function changePin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requirePassenger();
  const current = String(formData.get("current") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (next.length < 4) return { error: "O novo PIN deve ter ao menos 4 dígitos." };
  if (next !== confirm) return { error: "A confirmação não confere." };

  const passenger = await db.passenger.findUnique({
    where: { id: session.passengerId },
  });
  if (!passenger || passenger.pin !== current) {
    return { error: "PIN atual incorreto." };
  }

  await db.passenger.update({
    where: { id: session.passengerId },
    // pinCustom impede que o admin sobrescreva o PIN escolhido pelo passageiro
    data: { pin: next, pinCustom: true },
  });
  revalidatePath("/portal/dados");
  return { ok: true };
}

export async function updateContact(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requirePassenger();
  await db.passenger.update({
    where: { id: session.passengerId },
    data: {
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      emergencyName: String(formData.get("emergencyName") ?? "").trim(),
      emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim(),
      dietary: String(formData.get("dietary") ?? "").trim(),
    },
  });
  revalidatePath("/portal/dados");
  return { ok: true };
}
