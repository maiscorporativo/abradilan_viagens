"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTripWriter } from "@/lib/auth";
import { parseDateInput } from "@/lib/utils";

export type EventSettingsState = { error?: string; ok?: boolean };

type JsonItem = Record<string, string>;

/**
 * Lê listas dinâmicas (hotéis, comodidades) enviadas como campos indexados —
 * `hotel_nome_0`, `hotel_endereco_0`, … — e devolve o JSON gravado no Trip.
 */
function readList(formData: FormData, prefix: string, fields: string[]): string {
  const items: JsonItem[] = [];
  for (let i = 0; ; i++) {
    const values: JsonItem = {};
    let found = false;
    for (const field of fields) {
      const raw = formData.get(`${prefix}_${field}_${i}`);
      if (raw === null) continue;
      found = true;
      values[field] = String(raw).trim();
    }
    if (!found) break;
    // Descarta linhas em branco deixadas pelo formulário.
    if (Object.values(values).some((v) => v !== "")) items.push(values);
  }
  return JSON.stringify(items);
}

export async function updateEventSettings(
  tripId: string,
  _prev: EventSettingsState,
  formData: FormData
): Promise<EventSettingsState> {
  await requireTripWriter(tripId);
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const bool = (k: string) => formData.get(k) === "on";

  const kind = get("kind") === "EVENTO" ? "EVENTO" : "VIAGEM";
  const invitesEnabled = bool("invitesEnabled");

  if (invitesEnabled && kind !== "EVENTO") {
    return {
      error:
        "O módulo de convites só se aplica a registros do tipo Evento. Altere o tipo antes de ativá-lo.",
    };
  }

  await db.trip.update({
    where: { id: tripId },
    data: {
      kind,
      invitesEnabled,
      tablesEnabled: bool("tablesEnabled"),
      eventTime: get("eventTime"),
      venueName: get("venueName"),
      venueAddress: get("venueAddress"),
      dressCode: get("dressCode"),
      inviteDeadline: parseDateInput(get("inviteDeadline")),
      replyTo: get("replyTo"),
      emailTitle: get("emailTitle"),
      emailText: get("emailText"),
      emailFooter: get("emailFooter"),
      whatsappTemplate: get("whatsappTemplate"),
      cancelTemplate: get("cancelTemplate"),
      showAgencyLogo: bool("showAgencyLogo"),
      hotels: readList(formData, "hotel", ["nome", "endereco", "telefone", "distancia"]),
      facilities: readList(formData, "facility", ["titulo", "descricao"]),
    },
  });

  revalidatePath(`/admin/t/${tripId}/settings`);
  revalidatePath(`/admin/t/${tripId}`);
  return { ok: true };
}
