"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";

export type TableActionState = {
  /** Muda a cada gravação bem-sucedida — é o gatilho de fechar o modal. */
  savedAt?: number;
  error?: string;
  ok?: boolean;
};

export async function createTable(
  tripId: string,
  _prev: TableActionState,
  formData: FormData
): Promise<TableActionState> {
  await requireTripWriter(tripId);
  const number = Number(formData.get("number") ?? 0);
  if (!Number.isInteger(number) || number <= 0) {
    return { error: "Informe um número de mesa válido." };
  }

  const exists = await db.eventTable.findUnique({
    where: { tripId_number: { tripId, number } },
    select: { id: true },
  });
  if (exists) return { error: `A mesa ${number} já existe neste evento.` };

  // Distribui as mesas novas em grade, para não nascerem empilhadas.
  const count = await db.eventTable.count({ where: { tripId } });
  await db.eventTable.create({
    data: {
      tripId,
      number,
      name: String(formData.get("name") ?? "").trim(),
      capacity: Math.max(1, Number(formData.get("capacity") ?? 8)),
      shape: String(formData.get("shape") ?? "REDONDA"),
      x: 80 + (count % 5) * 150,
      y: 90 + Math.floor(count / 5) * 150,
    },
  });

  revalidatePath(`/admin/t/${tripId}/tables`);
  return { ok: true, savedAt: Date.now() };
}

export async function updateTable(
  tripId: string,
  tableId: string,
  data: { name?: string; capacity?: number; shape?: string }
) {
  await requireTripWriter(tripId);
  await db.eventTable.update({
    where: { id: tableId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.capacity !== undefined ? { capacity: Math.max(1, data.capacity) } : {}),
      ...(data.shape !== undefined ? { shape: data.shape } : {}),
    },
  });
  revalidatePath(`/admin/t/${tripId}/tables`);
}

/** Reposiciona a mesa no salão (arrastar-e-soltar do mapa). */
export async function moveTable(
  tripId: string,
  tableId: string,
  x: number,
  y: number
) {
  await requireTripWriter(tripId);
  await db.eventTable.update({
    where: { id: tableId },
    data: { x: Math.max(0, x), y: Math.max(0, y) },
  });
  revalidatePath(`/admin/t/${tripId}/tables`);
}

export async function deleteTable(tripId: string, tableId: string) {
  await requireTripWriter(tripId);
  // Os convidados acomodados voltam a ficar sem lugar (onDelete: SetNull),
  // mas os convites seguem válidos.
  await db.eventTable.delete({ where: { id: tableId } });
  revalidatePath(`/admin/t/${tripId}/tables`);
}

/** Acomoda (ou remove) um convidado em mesa/cadeira. */
export async function seatInvite(
  tripId: string,
  inviteId: string,
  tableId: string | null,
  seat: number | null
): Promise<TableActionState> {
  await requireTripWriter(tripId);

  if (tableId) {
    const table = await db.eventTable.findFirst({
      where: { id: tableId, tripId },
      include: { invites: { where: { status: { not: "CANCELADO" } } } },
    });
    if (!table) return { error: "Mesa não encontrada." };

    const others = table.invites.filter((i) => i.id !== inviteId);
    if (others.length >= table.capacity) {
      return { error: `A mesa ${table.number} já está com a lotação completa.` };
    }
    if (seat != null) {
      if (seat < 1 || seat > table.capacity) {
        return { error: `A cadeira deve estar entre 1 e ${table.capacity}.` };
      }
      if (others.some((i) => i.seat === seat)) {
        return { error: `A cadeira ${seat} desta mesa já está ocupada.` };
      }
    }
  }

  await db.invite.update({
    where: { id: inviteId },
    data: { tableId, seat: tableId ? seat : null },
  });
  revalidatePath(`/admin/t/${tripId}/tables`);
  revalidatePath(`/admin/t/${tripId}/invites`);
  return { ok: true, savedAt: Date.now() };
}
