import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  getStaffSession, getPassengerSession, getAssociateSession, getCompanySession,
  type StaffSession,
} from "./session";
import type { Prisma } from "@prisma/client";

/** Exige sessão de staff; redireciona para /login se ausente. */
export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige papel com permissão de escrita (MASTER ou AGENTE). */
export async function requireWriter() {
  const session = await requireStaff();
  if (!canWrite(session.role)) {
    throw new Error("Sem permissão para esta ação.");
  }
  return session;
}

/** Exige papel MASTER. */
export async function requireMaster() {
  const session = await requireStaff();
  if (session.role !== "MASTER") redirect("/admin");
  return session;
}

/** Exige sessão de passageiro; redireciona para /portal/login se ausente. */
export async function requirePassenger() {
  const session = await getPassengerSession();
  if (!session) redirect("/portal/login");
  return session;
}

/** Exige sessão de associado ABRADILAN; redireciona para /entrar se ausente. */
export async function requireAssociate() {
  const session = await getAssociateSession();
  if (!session) redirect("/entrar");
  const associate = await db.associate.findUnique({
    where: { id: session.associateId },
    select: { active: true },
  });
  if (!associate?.active) redirect("/entrar");
  return session;
}

/** Exige sessão da empresa convidada; redireciona para /empresa/login. */
export async function requireCompany() {
  const session = await getCompanySession();
  if (!session) redirect("/empresa/login");
  return session;
}

export function canWrite(role: string) {
  return role === "MASTER" || role === "AGENTE";
}

// ---------------------------------------------------------------------------
// Controle de acesso por viagem
// MASTER e usuários com allTrips=true acessam tudo; os demais, apenas as
// viagens vinculadas em UserTripAccess.
// ---------------------------------------------------------------------------

export async function canAccessTrip(session: StaffSession, tripId: string) {
  if (session.role === "MASTER") return true;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { allTrips: true, active: true },
  });
  if (!user?.active) return false;
  if (user.allTrips) return true;
  const access = await db.userTripAccess.findUnique({
    where: { userId_tripId: { userId: session.userId, tripId } },
  });
  return !!access;
}

/** Exige staff logado COM acesso à viagem; senão volta para /admin. */
export async function requireTripAccess(tripId: string) {
  const session = await requireStaff();
  if (!(await canAccessTrip(session, tripId))) redirect("/admin");
  return session;
}

/** Exige escrita (MASTER/AGENTE) + acesso à viagem. */
export async function requireTripWriter(tripId: string) {
  const session = await requireTripAccess(tripId);
  if (!canWrite(session.role)) {
    throw new Error("Sem permissão para esta ação.");
  }
  return session;
}

/** Filtro Prisma com as viagens visíveis para o usuário logado. */
export async function accessibleTripsWhere(
  session: StaffSession
): Promise<Prisma.TripWhereInput> {
  if (session.role === "MASTER") return {};
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { allTrips: true },
  });
  if (user?.allTrips) return {};
  return { userAccess: { some: { userId: session.userId } } };
}
