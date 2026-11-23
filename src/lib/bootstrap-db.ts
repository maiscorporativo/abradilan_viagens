import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { BOOTSTRAP_SQL } from "./bootstrap-sql";
import { AIRLINES, AIRPORTS } from "./catalog-data";

// Em ambientes onde não há como rodar `prisma db push` fora do app (ex.:
// hosting gerenciado que inicia o servidor direto, sem `npm start`), o banco
// SQLite precisa ser criado pelo próprio processo do servidor. Chamado pelo
// register() de src/instrumentation.ts a cada subida; todas as etapas são
// idempotentes.
export async function bootstrapDatabase() {
  // Com DATABASE_URL apontando para caminho absoluto persistente
  // (ex.: file:/home/user/dados-checkin/prod.db), o SQLite cria o arquivo,
  // mas não a pasta — criá-la antes da primeira conexão.
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:") && path.isAbsolute(url.slice(5))) {
    mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  }

  const userTable = await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
  );
  if (userTable.length === 0) {
    console.log("[bootstrap] Banco vazio — criando tabelas…");
    const statements = BOOTSTRAP_SQL.split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await db.$executeRawUnsafe(stmt);
    }
    console.log(`[bootstrap] ${statements.length} instruções executadas.`);
  }

  const email = process.env.ADMIN_EMAIL || "admin@incentivehub.local";
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: {
        name: process.env.ADMIN_NAME || "Administrador",
        email,
        role: "MASTER",
        passwordHash: await bcrypt.hash(
          process.env.ADMIN_PASSWORD || "admin123",
          10
        ),
      },
    });
    console.log(`[bootstrap] Usuário master criado: ${email}`);
  }

  // Redefinição pontual (uma vez só) da senha do master a partir de
  // ADMIN_EMAIL/ADMIN_PASSWORD. Um arquivo-marcador ao lado do banco impede
  // que rode de novo nas próximas subidas.
  const dbFile = url.startsWith("file:") ? url.slice(5) : "";
  const resetPassword = process.env.ADMIN_PASSWORD;
  if (existing && resetPassword && path.isAbsolute(dbFile)) {
    const marker = path.join(path.dirname(dbFile), ".admin-reset-2026-11");
    if (!existsSync(marker)) {
      await db.user.update({
        where: { id: existing.id },
        data: {
          role: "MASTER",
          active: true,
          passwordHash: await bcrypt.hash(resetPassword, 10),
        },
      });
      writeFileSync(marker, new Date().toISOString());
      console.log(`[bootstrap] Senha do master redefinida (uma vez): ${email}`);
    }
  }

  // Voos antigos guardavam um único localizador em Flight.locator. Passa esse
  // código para a lista (FlightLocator) e vincula quem já está no voo. Só
  // atinge voos que ainda não têm nenhum localizador na lista, então roda uma
  // vez por voo e não mexe em alocações feitas depois.
  const legacy = await db.flight.findMany({
    where: { locator: { not: "" }, locators: { none: {} } },
    select: { id: true, locator: true },
  });
  for (const flight of legacy) {
    const created = await db.flightLocator.create({
      data: { flightId: flight.id, code: flight.locator },
    });
    await db.flightPassenger.updateMany({
      where: { flightId: flight.id, locatorId: null },
      data: { locatorId: created.id },
    });
  }
  if (legacy.length > 0) {
    console.log(`[bootstrap] ${legacy.length} voo(s) migrado(s) para lista de localizadores.`);
  }

  for (const [code, name] of AIRLINES) {
    await db.airline.upsert({ where: { code }, update: {}, create: { code, name } });
  }
  for (const [iata, name, city, country] of AIRPORTS) {
    await db.airport.upsert({
      where: { iata },
      update: {},
      create: { iata, name, city, country },
    });
  }
}
