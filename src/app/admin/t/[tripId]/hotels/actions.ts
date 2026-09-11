"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { parseDateInput } from "@/lib/utils";

export type ActionState = { error?: string; ok?: boolean };

function hotelFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    checkIn: parseDateInput(String(formData.get("checkIn") ?? "")),
    checkOut: parseDateInput(String(formData.get("checkOut") ?? "")),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createHotel(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = hotelFromForm(formData);
  if (!data.name) return { error: "Nome do hotel é obrigatório." };
  await db.accommodation.create({ data: { ...data, tripId } });
  revalidatePath(`/admin/t/${tripId}/hotels`);
  return { ok: true };
}

export async function updateHotel(
  tripId: string,
  hotelId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const data = hotelFromForm(formData);
  if (!data.name) return { error: "Nome do hotel é obrigatório." };
  await db.accommodation.update({ where: { id: hotelId }, data });
  revalidatePath(`/admin/t/${tripId}/hotels`);
  return { ok: true };
}

export async function deleteHotel(tripId: string, hotelId: string) {
  await requireTripWriter(tripId);
  await db.accommodation.delete({ where: { id: hotelId } });
  revalidatePath(`/admin/t/${tripId}/hotels`);
}

export async function setHotelPassengers(
  tripId: string,
  hotelId: string,
  formData: FormData
) {
  await requireTripWriter(tripId);
  const selected = new Map<string, { roomNumber: string; roomType: string }>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("p_") && value === "on") {
      const id = key.slice(2);
      selected.set(id, {
        roomNumber: String(formData.get(`room_${id}`) ?? "").trim(),
        roomType: String(formData.get(`type_${id}`) ?? "").trim(),
      });
    }
  }

  const current = await db.accommodationPassenger.findMany({
    where: { accommodationId: hotelId },
  });
  const currentIds = new Set(current.map((c) => c.passengerId));
  const toRemove = [...currentIds].filter((id) => !selected.has(id));
  if (toRemove.length) {
    await db.accommodationPassenger.deleteMany({
      where: { accommodationId: hotelId, passengerId: { in: toRemove } },
    });
  }
  for (const [passengerId, data] of selected) {
    if (currentIds.has(passengerId)) {
      await db.accommodationPassenger.update({
        where: {
          accommodationId_passengerId: { accommodationId: hotelId, passengerId },
        },
        data,
      });
    } else {
      await db.accommodationPassenger.create({
        data: { accommodationId: hotelId, passengerId, ...data },
      });
    }
  }
  revalidatePath(`/admin/t/${tripId}/hotels`);
}
