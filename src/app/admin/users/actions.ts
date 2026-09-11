"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMaster } from "@/lib/auth";

export type ActionState = { error?: string; ok?: boolean };

/** Lê do formulário a configuração de acesso a viagens. */
function tripAccessFromForm(formData: FormData) {
  const allTrips = formData.get("allTrips") === "on";
  const tripIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("trip_") && value === "on") tripIds.push(key.slice(5));
  }
  return { allTrips, tripIds };
}

async function setTripAccess(userId: string, allTrips: boolean, tripIds: string[]) {
  await db.userTripAccess.deleteMany({ where: { userId } });
  if (!allTrips && tripIds.length > 0) {
    await db.userTripAccess.createMany({
      data: tripIds.map((tripId) => ({ userId, tripId })),
    });
  }
}

export async function createUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "AGENTE");

  if (!name || !email || password.length < 6) {
    return { error: "Preencha nome, e-mail e uma senha com ao menos 6 caracteres." };
  }
  if (!["MASTER", "AGENTE", "VISUALIZADOR"].includes(role)) {
    return { error: "Papel inválido." };
  }
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "Já existe um usuário com este e-mail." };

  const { allTrips, tripIds } = tripAccessFromForm(formData);
  // MASTER sempre enxerga tudo
  const effectiveAllTrips = role === "MASTER" ? true : allTrips;
  if (!effectiveAllTrips && tripIds.length === 0) {
    return { error: "Selecione ao menos uma viagem ou marque acesso a todas." };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      role,
      allTrips: effectiveAllTrips,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await setTripAccess(user.id, effectiveAllTrips, tripIds);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(
  userId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "AGENTE");
  const password = String(formData.get("password") ?? "");
  const active = formData.get("active") === "on";

  if (!name) return { error: "Nome é obrigatório." };
  if (userId === session.userId && (!active || role !== "MASTER")) {
    return { error: "Você não pode rebaixar ou desativar o próprio usuário." };
  }

  const { allTrips, tripIds } = tripAccessFromForm(formData);
  const effectiveAllTrips = role === "MASTER" ? true : allTrips;
  if (!effectiveAllTrips && tripIds.length === 0) {
    return { error: "Selecione ao menos uma viagem ou marque acesso a todas." };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      role,
      active,
      allTrips: effectiveAllTrips,
      ...(password.length >= 6
        ? { passwordHash: await bcrypt.hash(password, 10) }
        : {}),
    },
  });
  await setTripAccess(userId, effectiveAllTrips, tripIds);
  revalidatePath("/admin/users");
  return { ok: true };
}
