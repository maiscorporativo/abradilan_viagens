"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createStaffSession, destroyStaffSession } from "@/lib/session";

export type LoginState = { error?: string };

export async function staffLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) return { error: "Credenciais inválidas." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Credenciais inválidas." };

  await createStaffSession({ userId: user.id, name: user.name, role: user.role });
  await db.activityLog.create({
    data: {
      userId: user.id,
      actorName: user.name,
      actorType: "STAFF",
      action: "auth.login",
    },
  });
  redirect("/admin");
}

export async function staffLogout() {
  await destroyStaffSession();
  redirect("/login");
}
