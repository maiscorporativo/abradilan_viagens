"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import {
  newCompanyLogin, newInviteToken, newInviteCode, generatePassword,
  usedQuota, processInviteExpiration,
} from "@/lib/invites";

export type CompanyActionState = {
  /** Muda a cada gravação bem-sucedida — é o gatilho de fechar o modal. */
  savedAt?: number;
  error?: string;
  ok?: boolean;
  credentials?: { company: string; login: string; password: string };
};

/**
 * Cadastra a empresa convidada com sua cota e credenciais de acesso.
 * Se os dados do responsável vierem preenchidos, ele já entra inscrito —
 * consumindo 1 convite da cota, como no sistema de origem.
 */
export async function createCompany(
  tripId: string,
  _prev: CompanyActionState,
  formData: FormData
): Promise<CompanyActionState> {
  await requireTripWriter(tripId);
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const companyName = get("companyName");
  if (!companyName) return { error: "Informe o nome da empresa." };

  const quota = Math.max(1, Number(get("quota") || 4));
  const login = await newCompanyLogin(companyName);
  const password = generatePassword();

  const company = await db.eventCompany.create({
    data: {
      tripId,
      companyName,
      contactName: get("contactName"),
      contactRole: get("contactRole"),
      email: get("email"),
      phone: get("phone"),
      quota,
      login,
      passwordHash: await bcrypt.hash(password, 10),
      provisionalPassword: password,
    },
  });

  if (company.contactName) {
    await db.invite.create({
      data: {
        tripId,
        companyId: company.id,
        kind: "RESPONSAVEL",
        name: company.contactName,
        role: company.contactRole,
        email: company.email,
        phone: company.phone,
        token: newInviteToken(),
        code: await newInviteCode(),
      },
    });
  }

  revalidatePath(`/admin/t/${tripId}/companies`);
  return {
    ok: true,
    savedAt: Date.now(),
    credentials: { company: companyName, login, password },
  };
}

export async function updateCompany(
  tripId: string,
  companyId: string,
  _prev: CompanyActionState,
  formData: FormData
): Promise<CompanyActionState> {
  await requireTripWriter(tripId);
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const used = await usedQuota(companyId);
  // A cota nunca pode cair abaixo do que já foi utilizado — isso deixaria
  // convidados "órfãos" acima do limite.
  const quota = Math.max(used, Number(get("quota") || 1));

  await db.eventCompany.update({
    where: { id: companyId },
    data: {
      companyName: get("companyName"),
      contactName: get("contactName"),
      contactRole: get("contactRole"),
      email: get("email"),
      phone: get("phone"),
      quota,
    },
  });

  revalidatePath(`/admin/t/${tripId}/companies`);
  return { ok: true, savedAt: Date.now() };
}

export async function resetCompanyPassword(
  tripId: string,
  companyId: string
): Promise<CompanyActionState> {
  await requireTripWriter(tripId);
  const password = generatePassword();
  const company = await db.eventCompany.update({
    where: { id: companyId },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      provisionalPassword: password,
    },
  });
  revalidatePath(`/admin/t/${tripId}/companies`);
  return {
    ok: true,
    savedAt: Date.now(),
    credentials: { company: company.companyName, login: company.login, password },
  };
}

export async function deleteCompany(tripId: string, companyId: string) {
  await requireTripWriter(tripId);
  // Os convites da empresa continuam válidos, mas passam a individuais
  // (companyId vira null por onDelete: SetNull).
  await db.eventCompany.delete({ where: { id: companyId } });
  revalidatePath(`/admin/t/${tripId}/companies`);
}

/** Recolhe as cotas não usadas para o pool de convites individuais. */
export async function runInviteExpiration(
  tripId: string
): Promise<{ ok: boolean; error?: string; reclaimed?: number }> {
  await requireTripWriter(tripId);
  try {
    const result = await processInviteExpiration(tripId);
    revalidatePath(`/admin/t/${tripId}/companies`);
    revalidatePath(`/admin/t/${tripId}/invites`);
    return { ok: true, reclaimed: result.reclaimed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao processar." };
  }
}

/** Ajuste manual do pool de convites individuais (+n / -n). */
export async function adjustIndividualPool(tripId: string, delta: number) {
  await requireTripWriter(tripId);
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { individualPool: true },
  });
  if (!trip) throw new Error("Evento não encontrado.");
  const next = trip.individualPool + delta;
  if (next < 0) throw new Error("O pool não pode ficar negativo.");
  await db.trip.update({ where: { id: tripId }, data: { individualPool: next } });
  revalidatePath(`/admin/t/${tripId}/companies`);
}
