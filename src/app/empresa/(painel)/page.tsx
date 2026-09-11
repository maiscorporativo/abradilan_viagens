import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { baseUrl } from "@/lib/portal-config";
import { formatDateBR } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { PainelClient } from "./painel-client";

export default async function EmpresaPainelPage() {
  const session = await requireCompany();

  const company = await db.eventCompany.findUnique({
    where: { id: session.companyId },
    include: {
      trip: {
        select: {
          name: true,
          inviteDeadline: true,
          invitesExpired: true,
          venueName: true,
          startDate: true,
          eventTime: true,
        },
      },
      invites: {
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
        include: { table: { select: { number: true } } },
      },
    },
  });
  if (!company) redirect("/empresa/login");

  const trip = company.trip;
  const deadlinePassed =
    trip.invitesExpired ||
    (!!trip.inviteDeadline && new Date() > trip.inviteDeadline);

  const used = company.invites.filter((i) => i.status !== "CANCELADO").length;

  const eventSummary = [
    trip.startDate ? formatDateBR(trip.startDate) : "",
    trip.eventTime,
    trip.venueName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Convites da sua empresa"
        subtitle={eventSummary || trip.name}
      />
      <PainelClient
        baseUrl={baseUrl()}
        deadlinePassed={deadlinePassed}
        deadlineLabel={trip.inviteDeadline ? formatDateBR(trip.inviteDeadline) : null}
        company={{
          companyName: company.companyName,
          contactName: company.contactName,
          contactRole: company.contactRole,
          email: company.email,
          phone: company.phone,
          quota: company.quota,
          used,
        }}
        guests={company.invites.map((i) => ({
          id: i.id,
          name: i.name,
          role: i.role,
          email: i.email,
          phone: i.phone,
          kind: i.kind,
          status: i.status,
          seat:
            i.table?.number != null
              ? `Mesa ${i.table.number}${i.seat != null ? ` · cad. ${i.seat}` : ""}`
              : "",
          token: i.token,
        }))}
      />
    </>
  );
}
