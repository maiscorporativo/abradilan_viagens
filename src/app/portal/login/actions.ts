"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createPassengerSession, destroyPassengerSession } from "@/lib/session";
import { onlyDigits } from "@/lib/utils";

export type PassengerLoginState = {
  error?: string;
  // quando o mesmo CPF+PIN existe em mais de uma viagem ativa,
  // devolvemos as opções para o passageiro escolher
  choices?: { passengerId: string; tripName: string }[];
};

export async function passengerLogin(
  _prev: PassengerLoginState,
  formData: FormData
): Promise<PassengerLoginState> {
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  const chosenId = String(formData.get("passengerId") ?? "");

  if (!cpf || !pin) return { error: "Informe CPF e PIN." };

  // O PIN inicial é o próprio CPF: aceita também digitado com pontuação
  const pinDigits = onlyDigits(pin);
  const pinOptions = [{ pin }];
  if (pinDigits && pinDigits !== pin) pinOptions.push({ pin: pinDigits });

  const candidates = await db.passenger.findMany({
    where: {
      OR: pinOptions,
      blocked: false,
      trip: { status: { notIn: ["ARQUIVADA", "CONCLUIDA"] } },
    },
    include: { trip: { select: { id: true, name: true } } },
  });

  const matches = candidates.filter((p) => onlyDigits(p.cpf) === cpf);
  if (matches.length === 0) return { error: "CPF ou PIN inválidos." };

  let passenger = matches[0];
  if (matches.length > 1) {
    if (!chosenId) {
      return {
        choices: matches.map((m) => ({
          passengerId: m.id,
          tripName: m.trip.name,
        })),
      };
    }
    const chosen = matches.find((m) => m.id === chosenId);
    if (!chosen) return { error: "Seleção inválida." };
    passenger = chosen;
  }

  await createPassengerSession({
    passengerId: passenger.id,
    tripId: passenger.tripId,
    name: passenger.name,
  });
  await db.activityLog.create({
    data: {
      tripId: passenger.tripId,
      actorName: passenger.name,
      actorType: "PASSAGEIRO",
      action: "auth.passenger_login",
    },
  });
  redirect("/portal");
}

export async function passengerLogout() {
  await destroyPassengerSession();
  redirect("/portal/login");
}
