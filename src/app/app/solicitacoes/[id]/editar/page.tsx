import { notFound, redirect } from "next/navigation";
import { requireAssociate } from "@/lib/auth";
import { db } from "@/lib/db";
import { linhaDiretaName } from "@/lib/portal-config";
import { protocolOf } from "@/lib/briefing";
import { loadOwnRequest, canAssociateEdit } from "@/lib/travel-request";
import { PageHeader } from "@/components/ui";
import { EditClient } from "./edit-client";

/** Datas do banco no formato aceito pelo <input type="date">. */
function toInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditarSolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAssociate();

  const r = await loadOwnRequest(id, session.associateId);
  if (!r) notFound();
  // Assim que alguém assume o atendimento, a edição deixa de ser permitida.
  if (!canAssociateEdit(r.status)) redirect(`/app/solicitacoes/${id}`);

  const associate = await db.associate.findUnique({
    where: { id: session.associateId },
    select: { phone: true },
  });

  return (
    <>
      <PageHeader
        title={`Alterar solicitação #${protocolOf(r.id)}`}
        subtitle="O atendente será notificado automaticamente das mudanças."
      />
      <EditClient
        id={r.id}
        attendantName={linhaDiretaName()}
        defaults={{
          name: session.name,
          email: session.email,
          companyName: session.companyName,
          phone: associate?.phone ?? "",
        }}
        initial={{
          requesterName: r.requesterName,
          requesterEmail: r.requesterEmail,
          requesterPhone: r.requesterPhone,
          companyName: r.companyName,
          flexibleDates: r.flexibleDates,
          budget: r.budget,
          purpose: r.purpose,
          notes: r.notes,
          sendCopy: r.sendCopy,
          segments: r.segments.map((s) => ({
            origin: s.origin,
            destination: s.destination,
            date: toInput(s.date),
            timePreference: s.timePreference,
            notes: s.notes,
          })),
          passengers: r.passengers.map((p) => ({
            name: p.name,
            type: p.type,
            birthDate: toInput(p.birthDate),
            docType: p.docType,
            docNumber: p.docNumber,
            docExpiry: toInput(p.docExpiry),
            nationality: p.nationality,
            email: p.email,
            phone: p.phone,
            loyalty: p.loyalty,
            notes: p.notes,
          })),
          needsFlight: r.needsFlight,
          cabinClass: r.cabinClass,
          preferredAirline: r.preferredAirline,
          checkedBaggage: r.checkedBaggage,
          seatPreference: r.seatPreference,
          loyaltyProgram: r.loyaltyProgram,
          needsHotel: r.needsHotel,
          hotelCity: r.hotelCity,
          hotelCheckIn: toInput(r.hotelCheckIn),
          hotelCheckOut: toInput(r.hotelCheckOut),
          hotelCategory: r.hotelCategory,
          hotelRooms: r.hotelRooms,
          hotelRoomType: r.hotelRoomType,
          hotelChain: r.hotelChain,
          hotelBreakfast: r.hotelBreakfast,
          hotelReference: r.hotelReference,
          needsTransfer: r.needsTransfer,
          needsCarRental: r.needsCarRental,
          carCategory: r.carCategory,
          carPickup: r.carPickup,
          carDropoff: r.carDropoff,
          carExtraDriver: r.carExtraDriver,
          needsChauffeur: r.needsChauffeur,
          transferNotes: r.transferNotes,
          needsInsurance: r.needsInsurance,
          needsCurrency: r.needsCurrency,
          currencyNotes: r.currencyNotes,
          needsVisa: r.needsVisa,
          visaNotes: r.visaNotes,
          needsConnectivity: r.needsConnectivity,
          needsEventTicket: r.needsEventTicket,
          eventName: r.eventName,
        }}
      />
    </>
  );
}
