"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { newInviteToken, newInviteCode, remainingQuota } from "@/lib/invites";
import {
  sendInviteByEmail, sendInviteByWhatsapp, sendCancelNotice,
  type DispatchResult,
} from "@/lib/invite-dispatch";

export type InviteActionState = {
  /** Muda a cada gravação bem-sucedida — é o gatilho de fechar o modal. */
  savedAt?: number;
  error?: string;
  ok?: boolean;
};

/**
 * Cria um convidado. Com empresa, consome 1 da cota dela; sem empresa, é um
 * convite individual e consome 1 do pool da organização.
 */
export async function createInvite(
  tripId: string,
  _prev: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  await requireTripWriter(tripId);
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const name = get("name");
  if (!name) return { error: "Informe o nome do convidado." };

  const companyId = get("companyId") || null;

  if (companyId) {
    const company = await db.eventCompany.findFirst({
      where: { id: companyId, tripId },
      select: { id: true, companyName: true, quota: true },
    });
    if (!company) return { error: "Empresa não encontrada neste evento." };
    if ((await remainingQuota(companyId)) <= 0) {
      return {
        error: `A cota de ${company.companyName} (${company.quota}) já foi totalmente utilizada.`,
      };
    }
  } else {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { individualPool: true },
    });
    if (!trip || trip.individualPool <= 0) {
      return {
        error:
          "Não há convites individuais disponíveis. Processe a expiração das cotas ou aumente o pool.",
      };
    }
    await db.trip.update({
      where: { id: tripId },
      data: { individualPool: { decrement: 1 } },
    });
  }

  await db.invite.create({
    data: {
      tripId,
      companyId,
      kind: companyId ? "CONVIDADO" : "INDIVIDUAL",
      name,
      role: get("role"),
      email: get("email"),
      phone: get("phone"),
      notes: get("notes"),
      token: newInviteToken(),
      code: await newInviteCode(),
    },
  });

  revalidatePath(`/admin/t/${tripId}/invites`);
  revalidatePath(`/admin/t/${tripId}/companies`);
  return { ok: true, savedAt: Date.now() };
}

export async function updateInvite(
  tripId: string,
  inviteId: string,
  _prev: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  await requireTripWriter(tripId);
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  await db.invite.update({
    where: { id: inviteId },
    data: {
      name: get("name"),
      role: get("role"),
      email: get("email"),
      phone: get("phone"),
      notes: get("notes"),
    },
  });
  revalidatePath(`/admin/t/${tripId}/invites`);
  return { ok: true, savedAt: Date.now() };
}

/**
 * Cancela o convite (não apaga: preserva histórico e QR já distribuído) e
 * devolve a vaga — ao pool individual, quando o convite não era de empresa.
 */
export async function cancelInvite(
  tripId: string,
  inviteId: string,
  notify: boolean
): Promise<{ ok: boolean; error?: string; whatsappLink?: string }> {
  const session = await requireTripWriter(tripId);

  const invite = await db.invite.findFirst({
    where: { id: inviteId, tripId },
    select: { id: true, companyId: true, status: true },
  });
  if (!invite) return { ok: false, error: "Convite não encontrado." };
  if (invite.status === "CANCELADO") return { ok: false, error: "Já está cancelado." };

  // O aviso precisa dos dados antes do cancelamento surtir efeito no texto.
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
      canceledBy: session.name,
    },
  });

  if (!invite.companyId) {
    await db.trip.update({
      where: { id: tripId },
      data: { individualPool: { increment: 1 } },
    });
  }

  revalidatePath(`/admin/t/${tripId}/invites`);
  revalidatePath(`/admin/t/${tripId}/companies`);
  return { ok: true, whatsappLink };
}

export async function dispatchInvite(
  tripId: string,
  inviteId: string,
  channel: "EMAIL" | "WHATSAPP"
): Promise<DispatchResult> {
  await requireTripWriter(tripId);
  const result =
    channel === "EMAIL"
      ? await sendInviteByEmail(inviteId)
      : await sendInviteByWhatsapp(inviteId);
  revalidatePath(`/admin/t/${tripId}/invites`);
  return result;
}

/** Disparo em lote; devolve o relatório por convidado. */
export async function dispatchInvitesBatch(
  tripId: string,
  inviteIds: string[],
  channel: "EMAIL" | "WHATSAPP"
): Promise<{ inviteId: string; name: string; result: DispatchResult }[]> {
  await requireTripWriter(tripId);
  const report: { inviteId: string; name: string; result: DispatchResult }[] = [];

  for (const inviteId of inviteIds) {
    const invite = await db.invite.findFirst({
      where: { id: inviteId, tripId },
      select: { name: true },
    });
    if (!invite) continue;
    const result =
      channel === "EMAIL"
        ? await sendInviteByEmail(inviteId)
        : await sendInviteByWhatsapp(inviteId);
    report.push({ inviteId, name: invite.name, result });
  }

  revalidatePath(`/admin/t/${tripId}/invites`);
  return report;
}
