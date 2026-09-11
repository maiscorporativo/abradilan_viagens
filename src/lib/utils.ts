import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onlyDigits(v: string | null | undefined) {
  return String(v ?? "").replace(/\D/g, "");
}

export function formatCpf(v: string | null | undefined) {
  const d = onlyDigits(v).padStart(11, "0").slice(-11);
  if (d.length !== 11) return v ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatDateBR(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTimeBR(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function randomToken(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) out += chars[b % chars.length];
  return out;
}

export function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * PIN inicial do passageiro: o próprio CPF (só dígitos), para simplificar a
 * comunicação — o passageiro entra com CPF e CPF e troca depois se quiser.
 * Sem CPF válido (estrangeiros, cadastro incompleto), cai em PIN aleatório.
 */
export function defaultPin(cpf: string | null | undefined) {
  const digits = onlyDigits(String(cpf ?? ""));
  return digits.length === 11 ? digits : randomPin();
}

/** Converte "dd/mm/aaaa" ou "aaaa-mm-dd" em Date (UTC) ou null. */
export function parseDateInput(v: string | null | undefined): Date | null {
  if (!v) return null;
  const s = v.trim();
  let y = 0, m = 0, d = 0;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    [y, m, d] = s.slice(0, 10).split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    [d, m, y] = s.split("/").map(Number);
    if (y < 100) y += y <= new Date().getFullYear() % 100 ? 2000 : 1900;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  return isNaN(date.getTime()) ? null : date;
}

/** Converte Date em valor para <input type="date"> */
export function toInputDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** Converte Date em valor para <input type="datetime-local"> */
export function toInputDateTime(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function parseDateTimeInput(v: string | null | undefined): Date | null {
  if (!v) return null;
  const date = new Date(v + (v.length === 16 ? ":00Z" : "Z"));
  return isNaN(date.getTime()) ? null : date;
}
