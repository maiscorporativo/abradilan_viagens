// Troca (ou cria) a senha de um usuário master. Execução manual, uma vez:
//   DATABASE_URL="file:/caminho/prod.db" node scripts/reset-admin.mjs email@dominio "NovaSenha"
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [emailArg, password] = process.argv.slice(2);
if (!emailArg || !password) {
  console.error('Uso: node scripts/reset-admin.mjs <email> "<nova senha>"');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const db = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "MASTER", active: true },
    create: { name: "Administrador", email, role: "MASTER", passwordHash },
  });
  console.log(`OK: senha definida para ${user.email}`);
  const all = await db.user.findMany({ select: { email: true, role: true, active: true } });
  console.log("Usuários no banco:", all);
} finally {
  await db.$disconnect();
}
