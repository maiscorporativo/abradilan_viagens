"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import {
  saveUpload, readUpload, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES,
} from "@/lib/storage";
import { VOUCHER_SECTIONS } from "@/lib/constants";
import type { VoucherSectionConfig } from "@/lib/voucher";
import { generateVoucherPdf } from "@/lib/voucher";
import { sendEmailWithPdf, sendWhatsappPdf } from "@/lib/messaging";
import type { PlacedField } from "@/lib/voucher-fields";

export type ActionState = { error?: string; ok?: boolean };

async function templateFromForm(tripId: string, formData: FormData) {
  // Seções: checkboxes section_<key> na ordem canônica + texto livre
  const sections: VoucherSectionConfig[] = [];
  for (const key of Object.keys(VOUCHER_SECTIONS)) {
    if (formData.get(`section_${key}`) === "on") {
      if (key === "freeText") {
        sections.push({
          key,
          title: String(formData.get("freeTextTitle") ?? "Informações").trim(),
          content: String(formData.get("freeTextContent") ?? "").trim(),
        });
      } else {
        sections.push({ key });
      }
    }
  }

  let logoPath: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0 && ALLOWED_UPLOAD_TYPES.has(logo.type)) {
    const saved = await saveUpload(
      `trips/${tripId}/vouchers`,
      logo.name,
      Buffer.from(await logo.arrayBuffer())
    );
    logoPath = saved.filePath;
  }

  // PDF de fundo (modo template com editor visual de campos)
  let backgroundPdfPath: string | undefined;
  const bg = formData.get("backgroundPdf");
  if (bg instanceof File && bg.size > 0) {
    if (bg.type !== "application/pdf") throw new Error("PDF_INVALIDO");
    if (bg.size > MAX_UPLOAD_BYTES) throw new Error("PDF_GRANDE");
    const saved = await saveUpload(
      `trips/${tripId}/vouchers`,
      bg.name,
      Buffer.from(await bg.arrayBuffer())
    );
    backgroundPdfPath = saved.filePath;
  }
  if (formData.get("removeBackgroundPdf") === "on") backgroundPdfPath = "";

  return {
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "PERSONALIZADO"),
    headerText: String(formData.get("headerText") ?? "").trim(),
    footerText: String(formData.get("footerText") ?? "").trim(),
    accentColor: String(formData.get("accentColor") ?? "#002042"),
    sections: JSON.stringify(sections),
    ...(logoPath ? { logoPath } : {}),
    ...(backgroundPdfPath !== undefined ? { backgroundPdfPath } : {}),
  };
}

function uploadErrorMessage(e: unknown): string | null {
  if (e instanceof Error && e.message === "PDF_INVALIDO") {
    return "O template deve ser um arquivo PDF.";
  }
  if (e instanceof Error && e.message === "PDF_GRANDE") {
    return "PDF muito grande (máx. 15 MB).";
  }
  return null;
}

export async function createVoucherTemplate(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  try {
    const data = await templateFromForm(tripId, formData);
    if (!data.name) return { error: "Dê um nome ao template (ex.: Voucher Internacional)." };
    await db.voucherTemplate.create({ data: { ...data, tripId } });
  } catch (e) {
    const msg = uploadErrorMessage(e);
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath(`/admin/t/${tripId}/vouchers`);
  return { ok: true };
}

export async function updateVoucherTemplate(
  tripId: string,
  templateId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireTripWriter(tripId);
  try {
    const data = await templateFromForm(tripId, formData);
    if (!data.name) return { error: "Dê um nome ao template." };
    await db.voucherTemplate.update({ where: { id: templateId }, data });
  } catch (e) {
    const msg = uploadErrorMessage(e);
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath(`/admin/t/${tripId}/vouchers`);
  return { ok: true };
}

/**
 * Copia um arquivo do storage para a pasta de outra viagem, devolvendo o novo
 * caminho. Assim a cópia do template não depende da viagem de origem.
 */
async function copyUpload(sourcePath: string, targetTripId: string) {
  if (!sourcePath) return "";
  try {
    const data = await readUpload(sourcePath);
    const saved = await saveUpload(
      `trips/${targetTripId}/vouchers`,
      sourcePath.split("/").pop() || "arquivo",
      data
    );
    return saved.filePath;
  } catch {
    return ""; // arquivo de origem indisponível — segue sem
  }
}

/**
 * Duplica um template (na mesma viagem ou em outra), preservando o PDF de
 * fundo e os campos já posicionados no editor visual.
 */
export async function copyVoucherTemplate(
  tripId: string,
  templateId: string,
  targetTripId: string,
  newName: string
): Promise<ActionState> {
  await requireTripWriter(tripId); // acesso à viagem de origem
  await requireTripWriter(targetTripId); // e à de destino

  const source = await db.voucherTemplate.findUnique({ where: { id: templateId } });
  if (!source || source.tripId !== tripId) {
    return { error: "Template não encontrado." };
  }

  const name = newName.trim() || `${source.name} (cópia)`;
  const [backgroundPdfPath, logoPath] = await Promise.all([
    copyUpload(source.backgroundPdfPath, targetTripId),
    copyUpload(source.logoPath, targetTripId),
  ]);

  await db.voucherTemplate.create({
    data: {
      tripId: targetTripId,
      name,
      kind: source.kind,
      headerText: source.headerText,
      footerText: source.footerText,
      accentColor: source.accentColor,
      sections: source.sections,
      fields: source.fields,
      backgroundPdfPath,
      logoPath,
      visibleToPassenger: false, // revisar antes de publicar no portal
    },
  });

  revalidatePath(`/admin/t/${targetTripId}/vouchers`);
  revalidatePath(`/admin/t/${tripId}/vouchers`);
  return { ok: true };
}

/** Liga/desliga a exibição do voucher na área Documentos do portal. */
export async function setTemplateVisibility(
  tripId: string,
  templateId: string,
  visible: boolean
) {
  await requireTripWriter(tripId);
  await db.voucherTemplate.updateMany({
    where: { id: templateId, tripId },
    data: { visibleToPassenger: visible },
  });
  revalidatePath(`/admin/t/${tripId}/vouchers`);
  revalidatePath("/portal/documentos");
}

export async function deleteVoucherTemplate(tripId: string, templateId: string) {
  await requireTripWriter(tripId);
  await db.voucherTemplate.delete({ where: { id: templateId } });
  revalidatePath(`/admin/t/${tripId}/vouchers`);
}

/** Salva os campos posicionados no editor visual. */
export async function saveTemplateFields(
  tripId: string,
  templateId: string,
  fields: PlacedField[]
): Promise<ActionState> {
  await requireTripWriter(tripId);
  const template = await db.voucherTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.tripId !== tripId) {
    return { error: "Template não encontrado." };
  }
  await db.voucherTemplate.update({
    where: { id: templateId },
    data: { fields: JSON.stringify(fields ?? []) },
  });
  revalidatePath(`/admin/t/${tripId}/vouchers`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Envio de vouchers por e-mail / WhatsApp
// ---------------------------------------------------------------------------

export type SendReport = {
  results: { passengerId: string; name: string; ok: boolean; error?: string }[];
};

export async function sendVouchers(
  tripId: string,
  templateId: string,
  channel: "email" | "whatsapp",
  passengerIds: string[]
): Promise<SendReport> {
  const session = await requireTripWriter(tripId);
  const [template, trip] = await Promise.all([
    db.voucherTemplate.findUnique({ where: { id: templateId } }),
    db.trip.findUnique({ where: { id: tripId } }),
  ]);
  if (!template || template.tripId !== tripId || !trip) {
    return { results: [{ passengerId: "", name: "—", ok: false, error: "Template não encontrado." }] };
  }

  const passengers = await db.passenger.findMany({
    where: { id: { in: passengerIds }, tripId, blocked: false },
    orderBy: { name: "asc" },
  });

  const results: SendReport["results"] = [];
  for (const p of passengers) {
    const generated = await generateVoucherPdf(templateId, p.id);
    if (!generated) {
      results.push({ passengerId: p.id, name: p.name, ok: false, error: "Falha ao gerar o PDF." });
      continue;
    }

    const caption =
      `Olá, ${p.name.split(" ")[0]}! Segue o seu ${template.name} ` +
      `da viagem ${trip.name}. Guarde este documento com você.`;

    const result =
      channel === "email"
        ? await sendEmailWithPdf({
            to: p.email,
            subject: `${template.name} — ${trip.name}`,
            text: caption,
            fileName: generated.fileName,
            pdfBytes: generated.bytes,
          })
        : await sendWhatsappPdf({
            phone: p.phone,
            caption,
            fileName: generated.fileName,
            pdfBytes: generated.bytes,
          });

    results.push({ passengerId: p.id, name: p.name, ok: result.ok, error: result.error });

    await db.activityLog.create({
      data: {
        tripId,
        userId: session.userId,
        actorName: session.name,
        actorType: "STAFF",
        action: `voucher.send_${channel}`,
        details: `${template.name} → ${p.name}: ${result.ok ? "enviado" : `falhou (${result.error})`}`,
      },
    });
  }

  return { results };
}
