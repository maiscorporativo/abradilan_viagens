import "server-only";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Armazenamento local em disco. Em deploy via GitHub (Hostinger), cada deploy
// substitui a pasta do app — defina STORAGE_DIR apontando para uma pasta
// persistente fora dela (mesmo padrão do DATA_DIR do sistema de convites).
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

function safeExt(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

export async function saveUpload(
  folder: string,
  fileName: string,
  data: Buffer
): Promise<{ filePath: string; size: number }> {
  const cleanFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, "");
  const dir = path.join(STORAGE_ROOT, cleanFolder);
  await mkdir(dir, { recursive: true });
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt(fileName)}`;
  const full = path.join(dir, unique);
  await writeFile(full, data);
  return { filePath: path.join(cleanFolder, unique).replace(/\\/g, "/"), size: data.length };
}

export async function readUpload(filePath: string): Promise<Buffer> {
  const clean = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const full = path.join(STORAGE_ROOT, clean);
  if (!full.startsWith(STORAGE_ROOT)) throw new Error("Caminho inválido");
  return readFile(full);
}

export async function deleteUpload(filePath: string) {
  try {
    const clean = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
    const full = path.join(STORAGE_ROOT, clean);
    if (!full.startsWith(STORAGE_ROOT)) return;
    await unlink(full);
  } catch {
    // arquivo já removido — ignorar
  }
}

export const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
