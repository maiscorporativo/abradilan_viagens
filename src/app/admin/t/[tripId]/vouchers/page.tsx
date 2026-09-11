import { db } from "@/lib/db";
import { requireStaff, canWrite, accessibleTripsWhere } from "@/lib/auth";
import { emailConfigured, whatsappConfigured } from "@/lib/messaging";
import { PageHeader } from "@/components/ui";
import { VouchersClient } from "./vouchers-client";

export default async function VouchersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;

  const [templates, passengers, trips] = await Promise.all([
    db.voucherTemplate.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
    }),
    db.passenger.findMany({
      where: { tripId, blocked: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    }),
    // viagens que o usuário pode escolher como destino da cópia
    db.trip.findMany({
      where: await accessibleTripsWhere(session),
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, clientName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Vouchers de viagem"
        subtitle="Crie templates automáticos ou envie um PDF próprio e posicione os campos no editor visual. Gere em PDF/ZIP ou envie por e-mail e WhatsApp."
      />
      <VouchersClient
        tripId={tripId}
        canWrite={canWrite(session.role)}
        trips={trips}
        emailReady={emailConfigured()}
        whatsappReady={whatsappConfigured()}
        passengers={passengers.map((p) => ({
          id: p.id,
          name: p.name,
          hasEmail: !!p.email,
          hasPhone: !!p.phone,
        }))}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          kind: t.kind,
          headerText: t.headerText,
          footerText: t.footerText,
          accentColor: t.accentColor,
          sections: t.sections,
          hasPdf: !!t.backgroundPdfPath,
          visibleToPassenger: t.visibleToPassenger,
          fieldCount: (() => {
            try {
              return (JSON.parse(t.fields || "[]") as unknown[]).length;
            } catch {
              return 0;
            }
          })(),
        }))}
      />
    </div>
  );
}
