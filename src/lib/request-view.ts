import type {
  TravelRequest, TravelSegment, TravelPassenger,
} from "@prisma/client";
import type { RequestDetailData } from "@/components/request-detail";

/**
 * Converte a solicitação (com trechos e passageiros) no formato serializável
 * consumido pelo componente de detalhe. Usado pela fila do staff e pela área
 * do associado — as duas telas mostram exatamente o mesmo briefing.
 */
export function toRequestDetail(
  r: TravelRequest & { segments: TravelSegment[]; passengers: TravelPassenger[] }
): RequestDetailData {
  return {
    tripType: r.tripType,
    flexibleDates: r.flexibleDates,
    budget: r.budget,
    purpose: r.purpose,
    notes: r.notes,
    handledBy: r.handledBy,
    dispatchLog: r.dispatchLog,
    segments: [...r.segments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        origin: s.origin,
        destination: s.destination,
        date: s.date?.toISOString() ?? null,
        timePreference: s.timePreference,
        notes: s.notes,
      })),
    passengers: [...r.passengers]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        birthDate: p.birthDate?.toISOString() ?? null,
        docType: p.docType,
        docNumber: p.docNumber,
        docExpiry: p.docExpiry?.toISOString() ?? null,
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
    hotelCheckIn: r.hotelCheckIn?.toISOString() ?? null,
    hotelCheckOut: r.hotelCheckOut?.toISOString() ?? null,
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
  };
}
