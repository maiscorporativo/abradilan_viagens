import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/utils";
import { TRIP_DOC_CATEGORIES } from "@/lib/constants";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const [docs, passengers] = await Promise.all([
    db.tripDocument.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: { passenger: { select: { name: true } } },
    }),
    db.passenger.findMany({
      where: { tripId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Documentos da viagem"
        subtitle="Arquivos disponibilizados aos passageiros no portal (vouchers, seguros, ingressos…) ou de uso interno."
      />
      <DocumentsClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        passengers={passengers}
        docs={docs.map((d) => ({
          id: d.id,
          title: d.title,
          category: TRIP_DOC_CATEGORIES[d.category] ?? d.category,
          fileName: d.fileName,
          size: d.size,
          passengerName: d.passenger?.name ?? null,
          visibleToPassenger: d.visibleToPassenger,
          createdAt: formatDateTimeBR(d.createdAt),
        }))}
      />
    </div>
  );
}
