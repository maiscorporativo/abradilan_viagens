import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./settings-client";
import { EventSettings } from "./event-settings";

/** Listas JSON do evento (hotéis, comodidades) gravadas como texto no Trip. */
function parseList(raw: string) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const session = await requireStaff();
  const { tripId } = await params;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { groups: { orderBy: { name: "asc" } } },
  });
  if (!trip) notFound();

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Identidade white-label, formulário do convidado, grupos, módulo de convites e ações administrativas."
      />
      <SettingsClient
        trip={{
          id: trip.id,
          name: trip.name,
          clientName: trip.clientName,
          destination: trip.destination,
          startDate: trip.startDate?.toISOString().slice(0, 10) ?? "",
          endDate: trip.endDate?.toISOString().slice(0, 10) ?? "",
          description: trip.description,
          status: trip.status,
          primaryColor: trip.primaryColor,
          formToken: trip.formToken,
          formOpen: trip.formOpen,
          formWelcome: trip.formWelcome,
          allowCompanion: trip.allowCompanion,
          logoPath: trip.logoPath,
          bannerPath: trip.bannerPath,
        }}
        groups={trip.groups.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
        canWrite={canWrite(session.role)}
        isMaster={session.role === "MASTER"}
      />

      <div className="mt-6">
        <EventSettings
          canWrite={canWrite(session.role)}
          trip={{
            id: trip.id,
            kind: trip.kind,
            invitesEnabled: trip.invitesEnabled,
            tablesEnabled: trip.tablesEnabled,
            eventTime: trip.eventTime,
            venueName: trip.venueName,
            venueAddress: trip.venueAddress,
            dressCode: trip.dressCode,
            inviteDeadline:
              trip.inviteDeadline?.toISOString().slice(0, 10) ?? "",
            replyTo: trip.replyTo,
            emailTitle: trip.emailTitle,
            emailText: trip.emailText,
            emailFooter: trip.emailFooter,
            whatsappTemplate: trip.whatsappTemplate,
            cancelTemplate: trip.cancelTemplate,
            showAgencyLogo: trip.showAgencyLogo,
            hotels: parseList(trip.hotels),
            facilities: parseList(trip.facilities),
          }}
        />
      </div>
    </div>
  );
}
