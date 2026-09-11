import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-troque-em-producao"
);

const STAFF_COOKIE = "abradilan_staff";
const PASSENGER_COOKIE = "abradilan_passenger";
const ASSOCIATE_COOKIE = "abradilan_associate";
const COMPANY_COOKIE = "abradilan_company";
const MAX_AGE = 60 * 60 * 12; // 12h

export type StaffSession = {
  kind: "staff";
  userId: string;
  name: string;
  role: string;
};

export type PassengerSession = {
  kind: "passenger";
  passengerId: string;
  tripId: string;
  name: string;
};

/** Associado ABRADILAN — conta permanente que acessa a área do usuário em /app. */
export type AssociateSession = {
  kind: "associate";
  associateId: string;
  name: string;
  email: string;
  companyName: string;
  role: string;
};

/** Empresa convidada de um evento — acessa /empresa para usar sua cota. */
export type CompanySession = {
  kind: "company";
  companyId: string;
  tripId: string;
  companyName: string;
};

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
}

async function verify<T>(token?: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}

export async function createStaffSession(s: Omit<StaffSession, "kind">) {
  const token = await sign({ ...s, kind: "staff" });
  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function createPassengerSession(s: Omit<PassengerSession, "kind">) {
  const token = await sign({ ...s, kind: "passenger" });
  (await cookies()).set(PASSENGER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  const s = await verify<StaffSession>(token);
  return s?.kind === "staff" ? s : null;
}

export async function getPassengerSession(): Promise<PassengerSession | null> {
  const token = (await cookies()).get(PASSENGER_COOKIE)?.value;
  const s = await verify<PassengerSession>(token);
  return s?.kind === "passenger" ? s : null;
}

export async function createAssociateSession(s: Omit<AssociateSession, "kind">) {
  const token = await sign({ ...s, kind: "associate" });
  (await cookies()).set(ASSOCIATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getAssociateSession(): Promise<AssociateSession | null> {
  const token = (await cookies()).get(ASSOCIATE_COOKIE)?.value;
  const s = await verify<AssociateSession>(token);
  return s?.kind === "associate" ? s : null;
}

export async function destroyAssociateSession() {
  (await cookies()).delete(ASSOCIATE_COOKIE);
}

export async function createCompanySession(s: Omit<CompanySession, "kind">) {
  const token = await sign({ ...s, kind: "company" });
  (await cookies()).set(COMPANY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getCompanySession(): Promise<CompanySession | null> {
  const token = (await cookies()).get(COMPANY_COOKIE)?.value;
  const s = await verify<CompanySession>(token);
  return s?.kind === "company" ? s : null;
}

export async function destroyCompanySession() {
  (await cookies()).delete(COMPANY_COOKIE);
}

export async function destroyStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function destroyPassengerSession() {
  (await cookies()).delete(PASSENGER_COOKIE);
}
