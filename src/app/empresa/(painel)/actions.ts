"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { newInviteToken, newInviteCode, remainingQuota } from "@/lib/invites";
import {
  sendInviteByEmail, sendInviteByWhatsapp, sendCancelNotice,
  type DispatchResult,
} from "@/lib/invite-dispatch";

export type CompanyPanelState = {
  error?: string;
  ok?: boolean;
  /** Link wa.me quando a Evolution não está configurada. */
  whatsappLink?: string;
  info?: string;
};

/** O prazo encerra na data-limite do evento ou quando a expiração é processada. */
async function deadlinePassed(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { inviteDeadline: true, invitesExpired: true },
  });
  if (!trip) return true;
  if (trip.invitesExpired) return true;
  if (!trip.inviteDeadline) return false;
  return new Date() > trip.inviteDeadline;
}

/** Dados do responsável — cria ou atualiza a própria inscrição dele. */
export async function saveCompanyProfile(
  _prev: CompanyPanelState,
  formData: FormData
): Promise<CompanyPanelState> {
  const session = await requireCompany();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const contactName = get("contactName");
  const contactRole = get("contactRole");
  if (!contactName || !contactRole) {
    return { error: "Nome e cargo do responsável são obrigatórios." };
  }

  const data = {
    contactName,
    contactRole,
    email: get("email"),
    phone: get("phone"),
  };
  await db.eventCompany.update({ where: { id: session.companyId }, data });

  const existing = await db.invite.findFirst({
    where: { companyId: session.companyId, kind: "RESPONSAVEL" },
  });

  if (existing) {
    await db.invite.update({
      where: { id: existing.id },
      data: {
        name: contactName,
        role: contactRole,
        email: data.email,
        phone: data.phone,
      },
    });
  } else {
    if (await deadlinePassed(session.tripId)) {
      return {
        error: "O prazo de inscrição foi encerrado. Contate a organização.",
      };
    }
    if ((await remainingQuota(session.companyId)) <= 0) {
      return { error: "Sua cota de convites já foi totalmente utilizada." };
    }
    await db.invite.create({
      data: {
        tripId: session.tripId,
        companyId: session.companyId,
        kind: "RESPONSAVEL",
        name: contactName,
        role: contactRole,
        email: data.email,
        phone: data.phone,
        token: newInviteToken(),
        code: await newInviteCode(),
      },
    });
  }

  revalidatePath("/empresa");
  return { ok: true };
}

/**
 * Inscreve um convidado da empresa. Como no sistema de origem, o convite é
 * disparado automaticamente logo após a inscrição.
 */
export async function addCompanyGuest(
  _prev: CompanyPanelState,
  formData: FormData
): Promise<CompanyPanelState> {
  const session = await requireCompany();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  if (await deadlinePassed(session.tripId)) {
    return { error: "O prazo de inscrição de convidados foi encerrado." };
  }
  const name = get("name");
  if (!name) return { error: "Informe o nome do convidado." };
  if ((await remainingQuota(session.companyId)) <= 0) {
    return { error: "Sua cota de convites já foi totalmente utilizada." };
  }

  const invite = await db.invite.create({
    data: {
      tripId: session.tripId,
      companyId: session.companyId,
      kind: "CONVIDADO",
      name,
      role: get("role"),
      email: get("email"),
      phone: get("phone"),
      token: newInviteToken(),
      code: await newInviteCode(),
    },
  });

  // Disparo automático nos canais disponíveis.
  const messages: string[] = [];
  let whatsappLink: string | undefined;
  if (invite.email) {
    const r = await sendInviteByEmail(invite.id);
    messages.push(`E-mail: ${r.detail}`);
  }
  if (invite.phone) {
    const r = await sendInviteByWhatsapp(invite.id);
    messages.push(`WhatsApp: ${r.detail}`);
    whatsappLink = r.link;
  }

  revalidatePath("/empresa");
  return {
    ok: true,
    whatsappLink,
    info: messages.join(" · ") || "Convidado inscrito. Envie o convite pelos botões da lista.",
  };
}

export async function resendCompanyInvite(
  inviteId: string,
  channel: "EMAIL" | "WHATSAPP"
): Promise<DispatchResult> {
  const session = await requireCompany();
  const invite = await db.invite.findFirst({
    where: { id: inviteId, companyId: session.companyId },
    select: { id: true },
  });
  if (!invite) {
    return { ok: false, status: "ERRO", detail: "Convite não pertence à sua empresa." };
  }
  const result =
    channel === "EMAIL"
      ? await sendInviteByEmail(inviteId)
      : await sendInviteByWhatsapp(inviteId);
  revalidatePath("/empresa");
  return result;
}

/** Cancela um convidado da própria empresa e libera a vaga da cota. */
export async function cancelCompanyGuest(
  inviteId: string,
  notify: boolean
): Promise<CompanyPanelState> {
  const session = await requireCompany();
  const invite = await db.invite.findFirst({
    where: { id: inviteId, companyId: session.companyId },
    select: { id: true, status: true, kind: true },
  });
  if (!invite) return { error: "Convite não pertence à sua empresa." };
  if (invite.kind === "RESPONSAVEL") {
    return {
      error:
        "O convite do responsável não pode ser cancelado por aqui. Contate a organização.",
    };
  }
  if (invite.status === "CREDENCIADO") {
    return { error: "Este convidado já foi credenciado no evento." };
  }

  let whatsappLink: string | undefined;
  if (notify) {
    const notice = await sendCancelNotice(inviteId);
    whatsappLink = notice.whatsapp?.link;
  }

  await db.invite.update({
    where: { id: inviteId },
    data: {
      status: "CANCELADO",
      canceledAt: new Date(),
      canceledBy: session.companyName,
    },
  });

  revalidatePath("/empresa");
  return { ok: true, whatsappLink };
}

export async function changeCompanyPassword(
  _prev: CompanyPanelState,
  formData: FormData
): Promise<CompanyPanelState> {
  const session = await requireCompany();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 6) {
    return { error: "A nova senha precisa ter ao menos 6 caracteres." };
  }

  const company = await db.eventCompany.findUnique({ where: { id: session.companyId } });
  if (!company) return { error: "Empresa não encontrada." };
  if (!(await bcrypt.compare(current, company.passwordHash))) {
    return { error: "Senha atual incorreta." };
  }

  await db.eventCompany.update({
    where: { id: company.id },
    data: {
      passwordHash: await bcrypt.hash(next, 10),
      // Zera a senha provisória: ela deixa de aparecer no painel do admin e
      // de acompanhar o convite do responsável.
      provisionalPassword: "",
    },
  });

  revalidatePath("/empresa");
  return { ok: true, info: "Senha alterada com sucesso." };
}
