import type {
  TravelRequest, TravelSegment, TravelPassenger,
} from "@prisma/client";
import {
  TRAVEL_REQUEST_KINDS, TRIP_TYPES, TIME_PREFERENCES, CABIN_CLASSES,
  SEAT_PREFERENCES, HOTEL_CATEGORIES, ROOM_TYPES, CAR_CATEGORIES,
  TRAVEL_PASSENGER_TYPES, TRAVEL_DOC_TYPES,
} from "./constants";
import { formatDateBR } from "./utils";

/**
 * Briefing da linha direta formatado para o WhatsApp do atendente dedicado.
 * O asterisco é a marcação de negrito do WhatsApp.
 *
 * Convenção das listas de linhas: `null` = campo ausente (some da mensagem);
 * `""` = linha em branco proposital, que separa blocos e sobrevive ao filtro.
 */
export function buildBriefingMessage(
  r: TravelRequest,
  adminUrl: string,
  segments: TravelSegment[] = [],
  passengers: TravelPassenger[] = []
): string {
  const linhas: (string | null)[] = [
    "*NOVA SOLICITAÇÃO DE VIAGEM — PORTAL ABRADILAN*",
    "",
    `*Solicitante:* ${r.requesterName}`,
    r.companyName ? `*Empresa:* ${r.companyName}` : null,
    r.requesterEmail ? `*E-mail:* ${r.requesterEmail}` : null,
    r.requesterPhone ? `*Telefone:* ${r.requesterPhone}` : null,
    "",
    `*Tipo:* ${TRAVEL_REQUEST_KINDS[r.kind] ?? r.kind} · ${TRIP_TYPES[r.tripType] ?? r.tripType}`,
    r.budget ? `*Orçamento:* ${r.budget}` : null,
    r.flexibleDates ? "*Datas flexíveis:* sim" : null,
  ];

  // ---------------------------------------------------------------- trechos
  if (segments.length > 0) {
    linhas.push("", "*ITINERÁRIO*");
    for (const [i, s] of [...segments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .entries()) {
      const horario =
        s.timePreference && s.timePreference !== "QUALQUER"
          ? ` (${TIME_PREFERENCES[s.timePreference] ?? s.timePreference})`
          : "";
      linhas.push(
        `${i + 1}. ${s.origin} → ${s.destination}` +
          `${s.date ? ` · ${formatDateBR(s.date)}` : ""}${horario}`
      );
      if (s.notes) linhas.push(`   ${s.notes}`);
    }
  }

  // ------------------------------------------------------------- passageiros
  if (passengers.length > 0) {
    linhas.push("", `*PASSAGEIROS (${passengers.length})*`);
    for (const [i, p] of [...passengers]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .entries()) {
      linhas.push(
        `${i + 1}. ${p.name} — ${TRAVEL_PASSENGER_TYPES[p.type] ?? p.type}`
      );
      const doc = p.docNumber
        ? `   ${TRAVEL_DOC_TYPES[p.docType] ?? p.docType}: ${p.docNumber}` +
          (p.docExpiry ? ` (val. ${formatDateBR(p.docExpiry)})` : "")
        : null;
      if (doc) linhas.push(doc);
      if (p.birthDate) linhas.push(`   Nascimento: ${formatDateBR(p.birthDate)}`);
      if (p.nationality) linhas.push(`   Nacionalidade: ${p.nationality}`);
      if (p.loyalty) linhas.push(`   Fidelidade: ${p.loyalty}`);
      if (p.email || p.phone) {
        linhas.push(`   Contato: ${[p.email, p.phone].filter(Boolean).join(" · ")}`);
      }
      if (p.notes) linhas.push(`   Obs.: ${p.notes}`);
    }
  }

  // ---------------------------------------------------------------- serviços
  if (r.needsFlight) {
    linhas.push(
      "",
      "*AÉREO*",
      `Classe: ${CABIN_CLASSES[r.cabinClass] ?? r.cabinClass}`,
      r.preferredAirline ? `Companhia preferida: ${r.preferredAirline}` : null,
      `Bagagem despachada: ${r.checkedBaggage ? "sim" : "não"}`,
      r.seatPreference && r.seatPreference !== "INDIFERENTE"
        ? `Assento: ${SEAT_PREFERENCES[r.seatPreference] ?? r.seatPreference}`
        : null,
      r.loyaltyProgram ? `Programa de fidelidade: ${r.loyaltyProgram}` : null
    );
  }

  if (r.needsHotel) {
    linhas.push(
      "",
      "*HOSPEDAGEM*",
      r.hotelCity ? `Cidade: ${r.hotelCity}` : null,
      r.hotelCheckIn
        ? `Check-in: ${formatDateBR(r.hotelCheckIn)}` +
          (r.hotelCheckOut ? ` · Check-out: ${formatDateBR(r.hotelCheckOut)}` : "")
        : null,
      `Quartos: ${r.hotelRooms} · ${ROOM_TYPES[r.hotelRoomType] ?? r.hotelRoomType}`,
      r.hotelCategory && r.hotelCategory !== "INDIFERENTE"
        ? `Categoria: ${HOTEL_CATEGORIES[r.hotelCategory] ?? r.hotelCategory}`
        : null,
      r.hotelChain ? `Rede preferida: ${r.hotelChain}` : null,
      `Café da manhã: ${r.hotelBreakfast ? "sim" : "não"}`,
      r.hotelReference ? `Referência: ${r.hotelReference}` : null
    );
  }

  if (r.needsTransfer || r.needsCarRental || r.needsChauffeur) {
    linhas.push(
      "",
      "*TRANSPORTE TERRESTRE*",
      r.needsTransfer ? "Traslado aeroporto ↔ hotel" : null,
      r.needsChauffeur ? "Motorista à disposição" : null,
      r.needsCarRental
        ? `Aluguel de carro${r.carCategory ? `: ${CAR_CATEGORIES[r.carCategory] ?? r.carCategory}` : ""}`
        : null,
      r.needsCarRental && r.carPickup ? `Retirada: ${r.carPickup}` : null,
      r.needsCarRental && r.carDropoff ? `Devolução: ${r.carDropoff}` : null,
      r.needsCarRental && r.carExtraDriver ? "Motorista adicional: sim" : null,
      r.transferNotes ? `Obs.: ${r.transferNotes}` : null
    );
  }

  const apoio = [
    r.needsInsurance ? "Seguro viagem" : null,
    r.needsCurrency
      ? `Câmbio${r.currencyNotes ? `: ${r.currencyNotes}` : ""}`
      : null,
    r.needsVisa ? `Visto/documentação${r.visaNotes ? `: ${r.visaNotes}` : ""}` : null,
    r.needsConnectivity ? "Chip / internet internacional" : null,
    r.needsEventTicket
      ? `Ingresso de evento/feira${r.eventName ? `: ${r.eventName}` : ""}`
      : null,
  ].filter((v): v is string => v !== null);

  if (apoio.length > 0) {
    linhas.push("", "*SERVIÇOS DE APOIO*", ...apoio.map((v) => `• ${v}`));
  }

  // ----------------------------------------------------------------- fecho
  linhas.push(
    "",
    r.purpose ? `*Motivo da viagem:*\n${r.purpose}` : null,
    r.notes ? `\n*Observações:*\n${r.notes}` : null,
    "",
    `Protocolo: ${protocolOf(r.id)}`,
    adminUrl
  );

  return linhas.filter((l) => l !== null).join("\n");
}

/** Código curto do protocolo, usado nas mensagens e na fila do staff. */
export function protocolOf(id: string) {
  return id.slice(-8).toUpperCase();
}

/** Resumo do itinerário em uma linha: "GRU → ORD → MEX → GRU". */
export function itineraryLabel(segments: { origin: string; destination: string }[]) {
  if (segments.length === 0) return "";
  const pontos = [segments[0].origin];
  for (const s of segments) pontos.push(s.destination);
  return pontos.filter(Boolean).join(" → ");
}

// ---------------------------------------------------------------------------
// Cópia para o próprio solicitante — comprovante do que foi pedido.
// Tom diferente do briefing operacional: confirma o registro, repete o que
// interessa a quem pediu e aponta para a página de acompanhamento.
// ---------------------------------------------------------------------------

/** Lista curta dos serviços pedidos, para o comprovante. */
export function servicesSummary(r: TravelRequest): string[] {
  return [
    r.needsFlight ? "Passagem aérea" : null,
    r.needsHotel ? "Hospedagem" : null,
    r.needsTransfer ? "Traslado" : null,
    r.needsCarRental ? "Aluguel de carro" : null,
    r.needsChauffeur ? "Motorista à disposição" : null,
    r.needsInsurance ? "Seguro viagem" : null,
    r.needsCurrency ? "Câmbio" : null,
    r.needsVisa ? "Visto / documentação" : null,
    r.needsConnectivity ? "Chip internacional" : null,
    r.needsEventTicket ? "Ingresso de evento" : null,
  ].filter((v): v is string => v !== null);
}

export function buildRequesterCopyText(
  r: TravelRequest,
  trackUrl: string,
  segments: TravelSegment[] = [],
  passengers: TravelPassenger[] = []
): string {
  const linhas: (string | null)[] = [
    "*Recebemos a sua solicitação de viagem* ✈️",
    "",
    `Olá, ${r.requesterName.split(" ")[0]}! Registramos o seu pedido e o atendente dedicado aos associados ABRADILAN já foi notificado.`,
    "",
    `*Protocolo:* ${protocolOf(r.id)}`,
  ];

  if (segments.length > 0) {
    linhas.push("", "*Itinerário:*");
    for (const [i, s] of [...segments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .entries()) {
      linhas.push(
        `${i + 1}. ${s.origin} → ${s.destination}` +
          `${s.date ? ` · ${formatDateBR(s.date)}` : ""}`
      );
    }
  }

  if (passengers.length > 0) {
    linhas.push(
      "",
      `*Passageiros:* ${passengers
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  const servicos = servicesSummary(r);
  if (servicos.length > 0) {
    linhas.push("", `*Serviços:* ${servicos.join(", ")}`);
  }

  linhas.push(
    "",
    "Em breve você recebe as opções. Para consultar ou alterar a solicitação:",
    trackUrl,
    "",
    "_Esta é uma cópia automática do seu pedido._"
  );

  return linhas.filter((l) => l !== null).join("\n");
}

export function buildRequesterCopyHtml(
  r: TravelRequest,
  trackUrl: string,
  segments: TravelSegment[] = [],
  passengers: TravelPassenger[] = []
): string {
  const esc = (v: string) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const ordered = [...segments].sort((a, b) => a.sortOrder - b.sortOrder);
  const servicos = servicesSummary(r);

  const linha = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:4px 0;color:#64748b;width:130px;">${label}</td><td style="padding:4px 0;color:#101828;">${value}</td></tr>`
      : "";

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#101828;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr><td style="background:#0f2836;padding:32px;text-align:center;">
    <div style="color:#1690d0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Linha direta de viagens</div>
    <div style="color:#eef4fb;font-size:22px;font-weight:700;margin-top:8px;">Recebemos a sua solicitação</div>
    <div style="color:#9db3cc;font-size:13px;margin-top:6px;">Protocolo ${protocolOf(r.id)}</div>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:16px;margin:0 0 16px;">Olá, <strong>${esc(r.requesterName.split(" ")[0])}</strong>!</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Registramos o seu pedido e o atendente dedicado aos associados ABRADILAN já foi
      notificado. Em breve você recebe as opções.
    </p>

    ${
      ordered.length
        ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0f2836;border-bottom:1px solid #d9e2ee;padding-bottom:6px;margin:0 0 10px;">Itinerário</h3>
    <ol style="font-size:14px;line-height:1.8;padding-left:18px;margin:0 0 22px;">${ordered
      .map(
        (s) =>
          `<li>${esc(s.origin)} → ${esc(s.destination)}${s.date ? ` · ${formatDateBR(s.date)}` : ""}</li>`
      )
      .join("")}</ol>`
        : ""
    }

    ${
      passengers.length
        ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0f2836;border-bottom:1px solid #d9e2ee;padding-bottom:6px;margin:0 0 10px;">Passageiros</h3>
    <ul style="font-size:14px;line-height:1.8;padding-left:18px;margin:0 0 22px;">${passengers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => `<li>${esc(p.name)}</li>`)
      .join("")}</ul>`
        : ""
    }

    <table role="presentation" width="100%" style="font-size:14px;margin-bottom:22px;">
      ${linha("Serviços", esc(servicos.join(", ")))}
      ${linha("Orçamento", esc(r.budget))}
      ${linha("Motivo", esc(r.purpose))}
    </table>

    <p style="text-align:center;margin:0;">
      <a href="${trackUrl}" style="display:inline-block;background-color:#1690d0;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-size:15px;font-weight:bold;">Acompanhar minha solicitação</a>
    </p>
  </td></tr>
  <tr><td style="background:#f6f8fb;border-top:1px solid #d9e2ee;padding:18px;text-align:center;font-size:12px;color:#8ba0b8;">
    Cópia automática do seu pedido · Portal ABRADILAN
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
