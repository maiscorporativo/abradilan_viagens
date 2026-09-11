"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createCompanySession, destroyCompanySession } from "@/lib/session";

export type CompanyLoginState = { error?: string };

export async function companyLogin(
  _prev: CompanyLoginState,
  formData: FormData
): Promise<CompanyLoginState> {
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { error: "Informe login e senha." };

  const company = await db.eventCompany.findUnique({
    where: { login },
    include: { trip: { select: { invitesEnabled: true, status: true } } },
  });
  if (!company) return { error: "Login ou senha inválidos." };

  const ok = await bcrypt.compare(password, company.passwordHash);
  if (!ok) return { error: "Login ou senha inválidos." };

  if (!company.trip.invitesEnabled) {
    return { error: "O módulo de convites deste evento está desativado." };
  }
  if (["ARQUIVADA", "CONCLUIDA"].includes(company.trip.status)) {
    return { error: "Este evento já foi encerrado." };
  }

  await createCompanySession({
    companyId: company.id,
    tripId: company.tripId,
    companyName: company.companyName,
  });
  await db.activityLog.create({
    data: {
      tripId: company.tripId,
      actorName: company.companyName,
      actorType: "EMPRESA",
      action: "auth.company_login",
    },
  });
  redirect("/empresa");
}

export async function companyLogout() {
  await destroyCompanySession();
  redirect("/empresa/login");
}
