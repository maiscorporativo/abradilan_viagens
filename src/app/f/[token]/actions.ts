"use server";

import { db } from "@/lib/db";
import { defaultPin, onlyDigits, parseDateInput } from "@/lib/utils";
import {
  saveUpload, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES,
} from "@/lib/storage";

export type GuestFormState = {
  error?: string;
  ok?: boolean;
  titularPin?: string;
  companionPin?: string;
};

async function saveDoc(
  tripId: string,
  passengerId: string,
  file: File,
  kind: string,
  uploadedBy: string
) {
  const saved = await saveUpload(
    `trips/${tripId}/passengers/${passengerId}`,
    file.name,
    Buffer.from(await file.arrayBuffer())
  );
  await db.passengerDocument.create({
    data: {
      passengerId,
      kind,
      fileName: file.name,
      filePath: saved.filePath,
      mimeType: file.type,
      size: saved.size,
      uploadedBy,
    },
  });
}

function validFile(f: FormDataEntryValue | null): File | null {
  if (!(f instanceof File) || f.size === 0) return null;
  if (!ALLOWED_UPLOAD_TYPES.has(f.type)) throw new Error("FORMATO");
  if (f.size > MAX_UPLOAD_BYTES) throw new Error("TAMANHO");
  return f;
}

export async function submitGuestForm(
  token: string,
  _prev: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  const trip = await db.trip.findUnique({ where: { formToken: token } });
  if (!trip || !trip.formOpen) {
    return { error: "Este formulário não está mais disponível." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return { error: "Preencha nome e e-mail." };
  if (cpf && cpf.length !== 11) return { error: "CPF inválido." };

  const base = {
    name,
    email,
    phone: String(formData.get("phone") ?? "").trim(),
    cpf,
    rg: String(formData.get("rg") ?? "").trim(),
    birthDate: parseDateInput(String(formData.get("birthDate") ?? "")),
    passportNumber: String(formData.get("passportNumber") ?? "").trim(),
    passportExpiry: parseDateInput(String(formData.get("passportExpiry") ?? "")),
    city: String(formData.get("city") ?? "").trim(),
    uf: String(formData.get("uf") ?? "").trim().toUpperCase(),
    dietary: String(formData.get("dietary") ?? "").trim(),
    medicalNotes: String(formData.get("medicalNotes") ?? "").trim(),
    emergencyName: String(formData.get("emergencyName") ?? "").trim(),
    emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim(),
    rsvpStatus: "CONFIRMADO",
    formFilledAt: new Date(),
  };

  try {
    // Titular: atualiza se já houver cadastro com o mesmo CPF nesta viagem
    const existing = cpf
      ? await db.passenger.findFirst({
          where: { tripId: trip.id, cpf, type: "TITULAR" },
        })
      : null;

    const titular = existing
      ? await db.passenger.update({ where: { id: existing.id }, data: base })
      : await db.passenger.create({
          data: { ...base, tripId: trip.id, type: "TITULAR", pin: defaultPin(cpf) },
        });

    // Alinha o PIN ao CPF informado agora, desde que o passageiro ainda não
    // tenha escolhido um PIN próprio. Sem PIN algum, gera um.
    if (!titular.pin || (!titular.pinCustom && cpf)) {
      await db.passenger.update({
        where: { id: titular.id },
        data: { pin: defaultPin(cpf) },
      });
    }

    const passportFile = validFile(formData.get("passportFile"));
    if (passportFile) {
      await saveDoc(trip.id, titular.id, passportFile, "PASSAPORTE", name);
    }
    const idFile = validFile(formData.get("idFile"));
    if (idFile) await saveDoc(trip.id, titular.id, idFile, "RG", name);

    let companionPin: string | undefined;
    if (trip.allowCompanion && formData.get("hasCompanion") === "on") {
      const cName = String(formData.get("cName") ?? "").trim();
      if (!cName) return { error: "Informe o nome do acompanhante." };
      const cCpf = onlyDigits(String(formData.get("cCpf") ?? ""));

      const cBase = {
        name: cName,
        email: String(formData.get("cEmail") ?? "").trim() || email,
        phone: String(formData.get("cPhone") ?? "").trim(),
        cpf: cCpf,
        birthDate: parseDateInput(String(formData.get("cBirthDate") ?? "")),
        passportNumber: String(formData.get("cPassportNumber") ?? "").trim(),
        passportExpiry: parseDateInput(String(formData.get("cPassportExpiry") ?? "")),
        city: base.city,
        uf: base.uf,
        dietary: String(formData.get("cDietary") ?? "").trim(),
        emergencyName: base.emergencyName,
        emergencyPhone: base.emergencyPhone,
        rsvpStatus: "CONFIRMADO",
        formFilledAt: new Date(),
        titularId: titular.id,
      };

      const existingComp = await db.passenger.findFirst({
        where: {
          tripId: trip.id,
          type: "ACOMPANHANTE",
          titularId: titular.id,
          ...(cCpf ? { cpf: cCpf } : { name: cName }),
        },
      });

      const companion = existingComp
        ? await db.passenger.update({ where: { id: existingComp.id }, data: cBase })
        : await db.passenger.create({
            data: {
              ...cBase,
              tripId: trip.id,
              type: "ACOMPANHANTE",
              pin: defaultPin(cCpf),
            },
          });
      if (!companion.pin || (!companion.pinCustom && cCpf)) {
        const updated = await db.passenger.update({
          where: { id: companion.id },
          data: { pin: defaultPin(cCpf) },
        });
        companion.pin = updated.pin;
      }
      companionPin = companion.pin || undefined;

      const cPassportFile = validFile(formData.get("cPassportFile"));
      if (cPassportFile) {
        await saveDoc(trip.id, companion.id, cPassportFile, "PASSAPORTE", cName);
      }
    }

    await db.activityLog.create({
      data: {
        tripId: trip.id,
        actorName: name,
        actorType: "PASSAGEIRO",
        action: "form.submit",
        details: `Formulário do convidado preenchido${companionPin ? " (com acompanhante)" : ""}`,
      },
    });

    const fresh = await db.passenger.findUnique({ where: { id: titular.id } });
    return { ok: true, titularPin: fresh?.pin, companionPin };
  } catch (e) {
    if (e instanceof Error && e.message === "FORMATO") {
      return { error: "Documento em formato não permitido. Use PDF, JPG ou PNG." };
    }
    if (e instanceof Error && e.message === "TAMANHO") {
      return { error: "Documento muito grande (máx. 15 MB)." };
    }
    console.error("Guest form error:", e);
    return { error: "Erro ao enviar. Tente novamente em instantes." };
  }
}
