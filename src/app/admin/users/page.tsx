import { db } from "@/lib/db";
import { requireMaster } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  await requireMaster();
  const [users, trips] = await Promise.all([
    db.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        allTrips: true,
        tripAccess: { select: { tripId: true } },
      },
    }),
    db.trip.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, clientName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Usuários do sistema"
        subtitle="Controle quem acessa a plataforma, com qual permissão e em quais viagens."
      />
      <UsersClient
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          allTrips: u.allTrips,
          tripIds: u.tripAccess.map((a) => a.tripId),
        }))}
        trips={trips}
      />
    </div>
  );
}
