"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createAssociateSession, destroyAssociateSession } from "@/lib/session";

export type AssociateLoginState = { error?: string };

export async function associateLogin(
  _prev: AssociateLoginState,
  formData: FormData
): Promise<AssociateLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const associate = await db.associate.findUnique({ where: { email } });
  // Mesma mensagem para e-mail inexistente e senha errada: não revela quem
  // é associado.
  if (!associate || !associate.active) return { error: "E-mail ou senha inválidos." };

  const ok = await bcrypt.compare(password, associate.passwordHash);
  if (!ok) return { error: "E-mail ou senha inválidos." };

  await db.associate.update({
    where: { id: associate.id },
    data: { lastLoginAt: new Date() },
  });
  await createAssociateSession({
    associateId: associate.id,
    name: associate.name,
    email: associate.email,
    companyName: associate.companyName,
    role: associate.role,
  });
  await db.activityLog.create({
    data: {
      actorName: associate.name,
      actorType: "ASSOCIADO",
      action: "auth.associate_login",
      details: associate.companyName,
    },
  });

  redirect(associate.mustChangePassword ? "/app/senha" : "/app");
}

export async function associateLogout() {
  await destroyAssociateSession();
  redirect("/entrar");
}
