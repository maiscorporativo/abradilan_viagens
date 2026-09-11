"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAssociate } from "@/lib/auth";

export type ChangePasswordState = { error?: string; success?: string };

export async function changeAssociatePassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await requireAssociate();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) {
    return { error: "A nova senha precisa ter ao menos 8 caracteres." };
  }
  if (next !== confirm) return { error: "A confirmação não confere com a nova senha." };

  const associate = await db.associate.findUnique({
    where: { id: session.associateId },
  });
  if (!associate) return { error: "Associado não encontrado." };

  const ok = await bcrypt.compare(current, associate.passwordHash);
  if (!ok) return { error: "Senha atual incorreta." };

  await db.associate.update({
    where: { id: associate.id },
    data: {
      passwordHash: await bcrypt.hash(next, 10),
      mustChangePassword: false,
    },
  });
  await db.activityLog.create({
    data: {
      actorName: associate.name,
      actorType: "ASSOCIADO",
      action: "associate.password_change",
    },
  });

  revalidatePath("/app/senha");
  return { success: "Senha alterada com sucesso." };
}
