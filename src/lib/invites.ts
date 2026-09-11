import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

// ---------------------------------------------------------------------------
// Núcleo do módulo de convites: tokens, códigos curtos, cotas e expiração.
// Porte das regras de src/db.js e src/rotas/admin.js do sistema de convites.
// ---------------------------------------------------------------------------

/** Token longo e secreto do link do convite (/convite/<token>). */
export function newInviteToken() {
  return crypto.randomBytes(16).toString("hex");
}

/** Senha provisória legível — sem caracteres ambíguos (0/O, 1/l/I). */
export function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

/**
 * Código curto de credenciamento (6 dígitos, único no sistema): digitável na
 * recepção quando não há como ler o QR. O token longo segue sendo o segredo
 * dos links — o código só vale junto da lista de convidados do evento.
 */
export async function newInviteCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const exists = await db.invite.findFirst({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  // Espaço praticamente esgotado (improvável): passa a 8 dígitos.
  return String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");
}

/** Login da empresa a partir do nome, com sufixo numérico quando repete. */
export async function newCompanyLogin(companyName: string): Promise<string> {
  const base =
    companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "empresa";

  for (let i = 0; i < 100; i++) {
    const login = i === 0 ? base : `${base}${i + 1}`;
    const exists = await db.eventCompany.findUnique({
      where: { login },
      select: { id: true },
    });
    if (!exists) return login;
  }
  return `${base}${crypto.randomInt(1000, 9999)}`;
}

/** Convites já usados por uma empresa (cancelados não contam). */
export async function usedQuota(companyId: string) {
  return db.invite.count({
    where: { companyId, status: { not: "CANCELADO" } },
  });
}

export async function remainingQuota(companyId: string) {
  const company = await db.eventCompany.findUnique({
    where: { id: companyId },
    select: { quota: true },
  });
  if (!company) return 0;
  return Math.max(0, company.quota - (await usedQuota(companyId)));
}

/**
 * Processa a data-limite do evento: o que cada empresa não usou é recolhido
 * para o pool de convites individuais da organização. A cota da empresa é
 * reduzida ao que ela efetivamente usou, de modo que ela não possa inscrever
 * mais ninguém depois da expiração.
 */
export async function processInviteExpiration(tripId: string) {
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Evento não encontrado.");
  if (trip.invitesExpired) {
    throw new Error("A expiração deste evento já foi processada.");
  }

  const companies = await db.eventCompany.findMany({ where: { tripId } });
  let reclaimed = 0;
  const detail: { company: string; reclaimed: number }[] = [];

  for (const company of companies) {
    const used = await usedQuota(company.id);
    const unused = Math.max(0, company.quota - used);
    if (unused > 0) {
      await db.eventCompany.update({
        where: { id: company.id },
        data: { quota: used },
      });
      reclaimed += unused;
      detail.push({ company: company.companyName, reclaimed: unused });
    }
  }

  await db.trip.update({
    where: { id: tripId },
    data: {
      individualPool: { increment: reclaimed },
      invitesExpired: true,
    },
  });

  return { reclaimed, detail, individualPool: trip.individualPool + reclaimed };
}
