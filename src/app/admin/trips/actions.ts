"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWriter, requireMaster, requireTripWriter } from "@/lib/auth";
import { parseDateInput, randomToken, slugify } from "@/lib/utils";
import { saveUpload, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

async function uniqueSlug(base: string) {
  let slug = slugify(base) || `viagem-${Date.now()}`;
  let i = 1;
  while (await db.trip.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++i}`;
  }
  return slug;
}

export async function createTrip(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireWriter();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  if (!name || !clientName) return { error: "Nome da viagem e cliente são obrigatórios." };

  const trip = await db.trip.create({
    data: {
      name,
      clientName,
      slug: await uniqueSlug(name),
      destination: String(formData.get("destination") ?? "").trim(),
      startDate: parseDateInput(String(formData.get("startDate") ?? "")),
      endDate: parseDateInput(String(formData.get("endDate") ?? "")),
      description: String(formData.get("description") ?? "").trim(),
      primaryColor: String(formData.get("primaryColor") ?? "#002042"),
      formToken: randomToken(),
    },
  });

  await db.activityLog.create({
    data: {
      tripId: trip.id,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "trip.create",
      details: name,
    },
  });

  redirect(`/admin/t/${trip.id}`);
}

export async function updateTrip(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTripWriter(tripId);
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  if (!name || !clientName) return { error: "Nome da viagem e cliente são obrigatórios." };

  let logoPath: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!ALLOWED_UPLOAD_TYPES.has(logo.type)) return { error: "Logo deve ser PNG, JPG ou WEBP." };
    if (logo.size > MAX_UPLOAD_BYTES) return { error: "Logo muito grande (máx. 15 MB)." };
    const saved = await saveUpload(
      `trips/${tripId}/branding`,
      logo.name,
      Buffer.from(await logo.arrayBuffer())
    );
    logoPath = saved.filePath;
  }

  let bannerPath: string | undefined;
  const banner = formData.get("banner");
  if (banner instanceof File && banner.size > 0) {
    if (!ALLOWED_UPLOAD_TYPES.has(banner.type)) {
      return { error: "Banner deve ser PNG, JPG ou WEBP." };
    }
    if (banner.size > MAX_UPLOAD_BYTES) {
      return { error: "Banner muito grande (máx. 15 MB)." };
    }
    const saved = await saveUpload(
      `trips/${tripId}/branding`,
      banner.name,
      Buffer.from(await banner.arrayBuffer())
    );
    bannerPath = saved.filePath;
  }
  if (formData.get("removeBanner") === "on") bannerPath = "";

  await db.trip.update({
    where: { id: tripId },
    data: {
      name,
      clientName,
      destination: String(formData.get("destination") ?? "").trim(),
      startDate: parseDateInput(String(formData.get("startDate") ?? "")),
      endDate: parseDateInput(String(formData.get("endDate") ?? "")),
      description: String(formData.get("description") ?? "").trim(),
      status: String(formData.get("status") ?? "PLANEJAMENTO"),
      primaryColor: String(formData.get("primaryColor") ?? "#002042"),
      formOpen: formData.get("formOpen") === "on",
      allowCompanion: formData.get("allowCompanion") === "on",
      formWelcome: String(formData.get("formWelcome") ?? "").trim(),
      ...(logoPath ? { logoPath } : {}),
      ...(bannerPath !== undefined ? { bannerPath } : {}),
    },
  });

  await db.activityLog.create({
    data: {
      tripId,
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "trip.update",
      details: name,
    },
  });

  revalidatePath(`/admin/t/${tripId}`, "layout");
  return { ok: true };
}

export async function regenerateFormToken(tripId: string) {
  await requireTripWriter(tripId);
  await db.trip.update({
    where: { id: tripId },
    data: { formToken: randomToken() },
  });
  revalidatePath(`/admin/t/${tripId}/settings`);
}

export async function deleteTrip(tripId: string) {
  const session = await requireMaster();
  const trip = await db.trip.delete({ where: { id: tripId } });
  await db.activityLog.create({
    data: {
      userId: session.userId,
      actorName: session.name,
      actorType: "STAFF",
      action: "trip.delete",
      details: trip.name,
    },
  });
  redirect("/admin");
}

// ------- Grupos da viagem -------
export async function createGroup(tripId: string, formData: FormData) {
  await requireTripWriter(tripId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.tripGroup.upsert({
    where: { tripId_name: { tripId, name } },
    update: { color: String(formData.get("color") ?? "#64748b") },
    create: { tripId, name, color: String(formData.get("color") ?? "#64748b") },
  });
  revalidatePath(`/admin/t/${tripId}/settings`);
}

export async function deleteGroup(tripId: string, groupId: string) {
  await requireTripWriter(tripId);
  await db.tripGroup.delete({ where: { id: groupId } });
  revalidatePath(`/admin/t/${tripId}/settings`);
}
