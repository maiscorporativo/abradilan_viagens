"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMaster } from "@/lib/auth";
import { randomToken } from "@/lib/utils";

export type AssociateActionState = {
  /** Muda a cada gravação bem-sucedida — é o gatilho de fechar o modal. */
  savedAt?: number;
  error?: string;
  ok?: boolean;
  /** Senha provisória gerada, exibida ao staff uma única vez. */
  password?: string;
};

function readForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    name: get("name"),
    email: get("email").toLowerCase(),
    companyName: get("companyName"),
    cnpj: get("cnpj"),
    phone: get("phone"),
    role: get("role") || "ASSOCIADO",
    active: formData.get("active") === "on",
  };
}

export async function createAssociate(
  _prev: AssociateActionState,
  formData: FormData
): Promise<AssociateActionState> {
  await requireMaster();
  const data = readForm(formData);

  if (!data.name || !data.email) return { error: "Informe nome e e-mail." };
  if (!["ASSOCIADO", "GESTOR"].includes(data.role)) return { error: "Perfil inválido." };

  const exists = await db.associate.findUnique({ where: { email: data.email } });
  if (exists) return { error: "Já existe um associado com este e-mail." };

  // Senha provisória de primeiro acesso; o associado é obrigado a trocá-la.
  const provisional = randomToken(5).toUpperCase();
  await db.associate.create({
    data: {
      ...data,
      active: true,
      passwordHash: await bcrypt.hash(provisional, 10),
      mustChangePassword: true,
    },
  });

  revalidatePath("/admin/associates");
  return { ok: true, password: provisional };
}

export async function updateAssociate(
  associateId: string,
  _prev: AssociateActionState,
  formData: FormData
): Promise<AssociateActionState> {
  await requireMaster();
  const data = readForm(formData);
  if (!data.name || !data.email) return { error: "Informe nome e e-mail." };

  const other = await db.associate.findUnique({ where: { email: data.email } });
  if (other && other.id !== associateId) {
    return { error: "Já existe outro associado com este e-mail." };
  }

  await db.associate.update({ where: { id: associateId }, data });
  revalidatePath("/admin/associates");
  return { ok: true, savedAt: Date.now() };
}

/** Gera nova senha provisória e força a troca no próximo acesso. */
export async function resetAssociatePassword(
  associateId: string
): Promise<AssociateActionState> {
  await requireMaster();
  const provisional = randomToken(5).toUpperCase();
  await db.associate.update({
    where: { id: associateId },
    data: {
      passwordHash: await bcrypt.hash(provisional, 10),
      mustChangePassword: true,
    },
  });
  revalidatePath("/admin/associates");
  return { ok: true, password: provisional };
}

export async function deleteAssociate(associateId: string) {
  await requireMaster();
  await db.associate.delete({ where: { id: associateId } });
  revalidatePath("/admin/associates");
}
