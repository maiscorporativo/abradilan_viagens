"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";

export type CheckinResult = {
  ok: boolean;
  error?: string;
  /** Preenchido quando o convidado foi localizado, mesmo em caso de erro. */
  guest?: {
    id: string;
    name: string;
    role: string;
    companyName: string;
    seat: string;
    status: string;
    alreadyCheckedIn: boolean;
    checkedInAt: string | null;
  };
};

/**
 * Credencia pelo conteúdo lido do QR (o link do convite), pelo token cru ou
 * pelo código curto digitado na recepção.
 */
export async function checkInByScan(
  tripId: string,
  raw: string
): Promise<CheckinResult> {
  await requireTripWriter(tripId);

  const value = raw.trim();
  if (!value) return { ok: false, error: "Nada foi lido." };

  // Aceita a URL completa do convite ou apenas o identificador.
  const fromUrl = value.match(/\/convite\/([A-Za-z0-9]+)/);
  const candidate = fromUrl ? fromUrl[1] : value;

  const invite = await db.invite.findFirst({
    where: {
      tripId,
      OR: [{ token: candidate }, { code: candidate }],
    },
    include: { company: true, table: true },
  });

  if (!invite) {
    return { ok: false, error: "Convite não encontrado neste evento." };
  }

  const guest = {
    id: invite.id,
    name: invite.name,
    role: invite.role,
    companyName: invite.company?.companyName ?? "",
    seat:
      invite.table?.number != null
        ? `Mesa ${invite.table.number}${invite.seat != null ? ` · cadeira ${invite.seat}` : ""}`
        : "",
    status: invite.status,
    alreadyCheckedIn: invite.status === "CREDENCIADO",
    checkedInAt: invite.checkedInAt?.toISOString() ?? null,
  };

  if (invite.status === "CANCELADO") {
    return { ok: false, error: "Convite CANCELADO — não permitir a entrada.", guest };
  }
  if (invite.status === "CREDENCIADO") {
    // Não é erro de leitura: é reentrada. A recepção decide o que fazer.
    return { ok: false, error: "Este convidado já foi credenciado.", guest };
  }

  const updated = await db.invite.update({
    where: { id: invite.id },
    data: { status: "CREDENCIADO", checkedInAt: new Date() },
  });
  await db.activityLog.create({
    data: {
      tripId,
      actorName: invite.name,
      actorType: "CONVIDADO",
      action: "invite.checkin",
    },
  });

  revalidatePath(`/admin/t/${tripId}/credenciamento`);
  return {
    ok: true,
    guest: {
      ...guest,
      status: "CREDENCIADO",
      alreadyCheckedIn: false,
      checkedInAt: updated.checkedInAt?.toISOString() ?? null,
    },
  };
}

/** Desfaz um credenciamento feito por engano. */
export async function undoCheckIn(tripId: string, inviteId: string) {
  await requireTripWriter(tripId);
  await db.invite.update({
    where: { id: inviteId },
    data: {
      status: "CONFIRMADO",
      checkedInAt: null,
    },
  });
  revalidatePath(`/admin/t/${tripId}/credenciamento`);
}
