import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AirlinesClient } from "./airlines-client";

export default async function AirlinesPage() {
  const session = await requireStaff();
  const [airlines, airports] = await Promise.all([
    db.airline.findMany({ orderBy: { name: "asc" } }),
    db.airport.findMany({ orderBy: { iata: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Catálogo de aviação"
        subtitle="Companhias aéreas (com logomarcas) e aeroportos usados em todas as viagens."
      />
      <AirlinesClient
        canWrite={canWrite(session.role)}
        airlines={airlines.map((a) => ({
          code: a.code,
          name: a.name,
          hasLogo: !!a.logoPath,
        }))}
        airports={airports}
      />
    </div>
  );
}
