import "server-only";
import {
  PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb,
} from "pdf-lib";
import { db } from "./db";
import { readUpload } from "./storage";
import { formatCpf, formatDateBR, formatDateTimeBR } from "./utils";
import type { PlacedField } from "./voucher-fields";

// ---------------------------------------------------------------------------
// Gerador de vouchers em PDF.
// O layout é desenhado programaticamente a partir do template (cores, textos
// e seções escolhidas), dispensando PDFs-modelo fixos por viagem.
// ---------------------------------------------------------------------------

export type VoucherSectionConfig = {
  key: string; // passenger | flights | accommodation | emergency | itinerary | freeText
  title?: string;
  content?: string; // usado por freeText
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0, 0.125, 0.259); // azul Mais Corporativo #002042
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Remove caracteres fora do WinAnsi (suportado pelas fontes padrão). */
function sanitize(v: string | null | undefined) {
  return String(v ?? "")
    .replace(/→/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xff]/g, "?");
}

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  accent: ReturnType<typeof rgb>;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage(A4);
  ctx.y = A4[1] - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) newPage(ctx);
}

function drawSectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 40);
  ctx.y -= 12;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: 3,
    height: 14,
    color: ctx.accent,
  });
  ctx.page.drawText(sanitize(title).toUpperCase(), {
    x: MARGIN + 10,
    y: ctx.y,
    size: 10,
    font: ctx.bold,
    color: rgb(0.12, 0.16, 0.23),
  });
  ctx.y -= 20;
}

function drawKeyValueGrid(ctx: Ctx, pairs: [string, string][]) {
  const colWidth = (A4[0] - MARGIN * 2) / 2;
  for (let i = 0; i < pairs.length; i += 2) {
    ensureSpace(ctx, 30);
    const row = pairs.slice(i, i + 2);
    row.forEach(([label, value], col) => {
      const x = MARGIN + col * colWidth;
      ctx.page.drawText(sanitize(label).toUpperCase(), {
        x,
        y: ctx.y,
        size: 6.5,
        font: ctx.bold,
        color: rgb(0.45, 0.5, 0.59),
      });
      ctx.page.drawText(sanitize(value) || "-", {
        x,
        y: ctx.y - 11,
        size: 10,
        font: ctx.font,
        color: rgb(0.09, 0.13, 0.2),
      });
    });
    ctx.y -= 30;
  }
}

function drawParagraph(ctx: Ctx, text: string, size = 9) {
  const maxWidth = A4[0] - MARGIN * 2;
  const words = sanitize(text).split(/\s+/);
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.font.widthOfTextAtSize(candidate, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  for (const l of lines) {
    ensureSpace(ctx, size + 5);
    ctx.page.drawText(l, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
      color: rgb(0.2, 0.25, 0.33),
    });
    ctx.y -= size + 4;
  }
}

type LoadedPassenger = NonNullable<
  Awaited<ReturnType<typeof loadPassengerForVoucher>>
>;

async function loadPassengerForVoucher(passengerId: string) {
  return db.passenger.findUnique({
    where: { id: passengerId },
    include: {
      group: true,
      flights: { include: { flight: true, locator: true } },
      accommodations: { include: { accommodation: true } },
    },
  });
}

function flightLine(f: {
  flightNumber: string;
  airlineName: string;
  airlineCode: string;
  operatedBy: string;
  originIata: string;
  destIata: string;
  depDateTime: Date | null;
  arrDateTime: Date | null;
  seat?: string;
}) {
  const parts = [
    `${f.flightNumber} · ${f.airlineName || f.airlineCode}`,
    `${f.originIata} -> ${f.destIata}`,
    f.depDateTime ? `${formatDateTimeBR(f.depDateTime)}` : "",
    f.arrDateTime ? `-> ${formatDateTimeBR(f.arrDateTime)}` : "",
    f.seat ? `Assento ${f.seat}` : "",
  ].filter(Boolean);
  let line = parts.join("  ·  ");
  if (f.operatedBy) line += `  (operado por ${f.operatedBy})`;
  return line;
}

function sortedFlights(passenger: LoadedPassenger) {
  return passenger.flights
    // o localizador impresso é o do passageiro neste voo; sem ele, o do voo
    .map((l) => ({
      ...l.flight,
      seat: l.seat,
      locator: l.locator?.code || l.flight.locator,
    }))
    .sort(
      (a, b) => (a.depDateTime?.getTime() ?? 0) - (b.depDateTime?.getTime() ?? 0)
    );
}

type VoucherFlight = ReturnType<typeof sortedFlights>[number];

/** Data/hora no mesmo fuso usado por formatDateTimeBR (local do servidor). */
function fmtFlightDate(d: Date | null) {
  return d
    ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "--";
}

function fmtFlightTime(d: Date | null) {
  return d
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")
    : "--";
}

function fmtDuration(ms: number) {
  const min = Math.round(ms / 60000);
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

/** Separa os voos em jornadas (ida/volta): gap de 24h+ inicia nova jornada. */
function groupJourneys(flights: VoucherFlight[]): VoucherFlight[][] {
  const groups: VoucherFlight[][] = [];
  let current: VoucherFlight[] = [];
  for (const f of flights) {
    const prev = current[current.length - 1];
    const gap =
      prev?.arrDateTime && f.depDateTime
        ? f.depDateTime.getTime() - prev.arrDateTime.getTime()
        : null;
    if (current.length > 0 && gap !== null && gap >= 24 * 3_600_000) {
      groups.push(current);
      current = [];
    }
    current.push(f);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * Desenha o bloco estruturado de voos (cartões IDA/VOLTA com companhia,
 * horários, duração e tempo de conexão) usado pelo campo "flights.summary"
 * no modo template PDF.
 */
function drawFlightsBlock(opts: {
  page: PDFPage;
  flights: VoucherFlight[];
  x: number;
  yTop: number;
  width: number;
  baseSize: number;
  font: PDFFont;
  bold: PDFFont;
  accent: ReturnType<typeof rgb>;
  logos: Map<string, PDFImage | null>;
}) {
  const { page, font, bold, accent, logos } = opts;
  const k = (opts.baseSize || 11) / 11; // escala a partir do tamanho do campo
  const ink = rgb(0.09, 0.13, 0.2);
  const sub = rgb(0.38, 0.44, 0.52);

  const groups = groupJourneys(opts.flights);
  const labels =
    groups.length === 2
      ? ["IDA", "VOLTA"]
      : groups.length === 1
        ? ["VOOS"]
        : groups.map((_, i) => `TRECHO ${i + 1}`);

  const headH = 24 * k;
  const segH = 44 * k;
  const connH = 16 * k;
  const pad = 10 * k;

  let top = opts.yTop;
  groups.forEach((group, gi) => {
    const cardH = headH + group.length * segH + (group.length - 1) * connH + 8 * k;
    if (top - cardH < 20) return; // sem espaço na página do template
    const cardX = opts.x;
    const cardW = opts.width;

    page.drawRectangle({
      x: cardX,
      y: top - cardH,
      width: cardW,
      height: cardH,
      color: rgb(1, 1, 1),
      opacity: 0.92,
      borderColor: accent,
      borderWidth: 1.2,
    });

    // Cabeçalho do cartão: IDA/VOLTA à esquerda, localizador à direita
    page.drawText(labels[gi], {
      x: cardX + pad,
      y: top - 16 * k,
      size: 11 * k,
      font: bold,
      color: accent,
    });
    const locators = [...new Set(group.map((f) => f.locator).filter(Boolean))];
    if (locators.length > 0) {
      const t = sanitize(`LOC: ${locators.join(" / ")}`);
      const w = bold.widthOfTextAtSize(t, 8 * k);
      page.drawText(t, {
        x: cardX + cardW - pad - w,
        y: top - 15 * k,
        size: 8 * k,
        font: bold,
        color: ink,
      });
    }
    page.drawLine({
      start: { x: cardX, y: top - headH },
      end: { x: cardX + cardW, y: top - headH },
      thickness: 0.8,
      color: accent,
      opacity: 0.5,
    });

    let yy = top - headH;
    group.forEach((f, si) => {
      const c0 = cardX + pad;
      const c1 = cardX + cardW * 0.32;
      const c2 = cardX + cardW * 0.56;
      const c3 = cardX + cardW * 0.8;
      const l1 = yy - 14 * k;
      const l2 = yy - 26 * k;
      const l3 = yy - 36 * k;

      // Coluna 0: logo + companhia + número do voo
      let tx = c0;
      const logo = logos.get(f.airlineCode);
      if (logo) {
        // encaixa em 34x16pt preservando a proporção da imagem
        const s = Math.min((16 * k) / logo.height, (34 * k) / logo.width);
        const w = logo.width * s;
        const h = logo.height * s;
        page.drawImage(logo, { x: c0, y: l2 - 2 * k, width: w, height: h });
        tx = c0 + w + 6 * k;
      }
      page.drawText(sanitize(f.airlineName || f.airlineCode), {
        x: tx, y: l1, size: 8.5 * k, font: bold, color: ink,
      });
      page.drawText(sanitize(f.flightNumber), {
        x: tx, y: l2, size: 8.5 * k, font, color: ink,
      });
      const extra = [
        f.seat ? `Assento ${f.seat}` : "",
        f.operatedBy ? `Operado por ${f.operatedBy}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (extra) {
        page.drawText(sanitize(extra), {
          x: c0, y: l3, size: 6.5 * k, font, color: sub,
        });
      }

      // Coluna 1: partida — data, aeroporto/hora, cidade
      page.drawText(fmtFlightDate(f.depDateTime), {
        x: c1, y: l1, size: 8.5 * k, font: bold, color: ink,
      });
      page.drawText(sanitize(`${f.originIata} - ${fmtFlightTime(f.depDateTime)}`), {
        x: c1, y: l2, size: 9.5 * k, font, color: ink,
      });
      if (f.originName) {
        page.drawText(sanitize(f.originName), {
          x: c1, y: l3, size: 7 * k, font, color: sub,
        });
      }

      // Coluna 2: chegada
      page.drawText(fmtFlightDate(f.arrDateTime), {
        x: c2, y: l1, size: 8.5 * k, font: bold, color: ink,
      });
      page.drawText(sanitize(`${f.destIata} - ${fmtFlightTime(f.arrDateTime)}`), {
        x: c2, y: l2, size: 9.5 * k, font, color: ink,
      });
      if (f.destName) {
        page.drawText(sanitize(f.destName), {
          x: c2, y: l3, size: 7 * k, font, color: sub,
        });
      }

      // Coluna 3: duração do voo
      const durMs =
        f.depDateTime && f.arrDateTime
          ? f.arrDateTime.getTime() - f.depDateTime.getTime()
          : null;
      if (durMs !== null && durMs > 0 && durMs < 24 * 3_600_000) {
        page.drawText(sanitize("Duração do voo"), {
          x: c3, y: l1, size: 7.5 * k, font: bold, color: ink,
        });
        page.drawText(fmtDuration(durMs), {
          x: c3, y: l2, size: 9.5 * k, font, color: ink,
        });
      }

      // Tempo de conexão entre trechos da mesma jornada
      if (si < group.length - 1) {
        const next = group[si + 1];
        const connMs =
          f.arrDateTime && next.depDateTime
            ? next.depDateTime.getTime() - f.arrDateTime.getTime()
            : null;
        if (connMs !== null && connMs > 0 && connMs < 24 * 3_600_000) {
          const t = sanitize(`Tempo de Conexão: ${fmtDuration(connMs)}`);
          const w = bold.widthOfTextAtSize(t, 8 * k);
          page.drawText(t, {
            x: cardX + (cardW - w) / 2,
            y: yy - segH - 11 * k,
            size: 8 * k,
            font: bold,
            color: sub,
          });
        }
        yy -= segH + connH;
      } else {
        yy -= segH;
      }
    });

    top -= cardH + 10 * k;
  });
}

/** Resolve o valor de um campo posicionado do editor visual. */
function resolveFieldValue(
  field: PlacedField,
  passenger: LoadedPassenger,
  trip: { name: string; clientName: string; destination: string; startDate: Date | null; endDate: Date | null }
): string {
  const hotel = passenger.accommodations[0];
  switch (field.source) {
    case "passenger.name": return passenger.name;
    case "passenger.cpf": return passenger.cpf ? formatCpf(passenger.cpf) : "";
    case "passenger.rg": return passenger.rg;
    case "passenger.passport": return passenger.passportNumber;
    case "passenger.birthDate": return formatDateBR(passenger.birthDate);
    case "passenger.phone": return passenger.phone;
    case "passenger.email": return passenger.email;
    case "passenger.category": return passenger.category;
    case "passenger.group": return passenger.group?.name ?? "";
    case "passenger.dietary": return passenger.dietary;
    case "passenger.emergency":
      return [passenger.emergencyName, passenger.emergencyPhone]
        .filter(Boolean)
        .join(" · ");
    case "trip.name": return trip.name;
    case "trip.clientName": return trip.clientName;
    case "trip.destination": return trip.destination;
    case "trip.period":
      return `${formatDateBR(trip.startDate)} — ${formatDateBR(trip.endDate)}`;
    case "hotel.name": return hotel?.accommodation.name ?? "";
    case "hotel.address":
      return hotel
        ? [hotel.accommodation.address, hotel.accommodation.city, hotel.accommodation.country]
            .filter(Boolean)
            .join(", ")
        : "";
    case "hotel.checkIn": return formatDateBR(hotel?.accommodation.checkIn);
    case "hotel.checkOut": return formatDateBR(hotel?.accommodation.checkOut);
    case "hotel.room": return hotel?.roomNumber ?? "";
    case "hotel.roomType": return hotel?.roomType ?? "";
    case "flights.summary":
      return sortedFlights(passenger).map(flightLine).join("\n");
    case "flights.first": {
      const first = sortedFlights(passenger)[0];
      return first ? flightLine(first) : "";
    }
    case "today":
      return new Date().toLocaleDateString("pt-BR");
    case "custom":
      return field.custom ?? "";
    default:
      return "";
  }
}

/** Gera o voucher sobre um PDF-template com os campos posicionados no editor. */
async function generateOverlayVoucher(
  template: { backgroundPdfPath: string; fields: string; accentColor: string },
  passenger: LoadedPassenger,
  trip: { name: string; clientName: string; destination: string; startDate: Date | null; endDate: Date | null; primaryColor: string }
): Promise<Uint8Array> {
  const basePdf = await readUpload(template.backgroundPdfPath);
  const doc = await PDFDocument.load(basePdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const accent = hexToRgb(template.accentColor || trip.primaryColor);

  let fields: PlacedField[] = [];
  try {
    fields = JSON.parse(template.fields || "[]");
  } catch {
    fields = [];
  }

  // Logos das companhias aéreas, usados pelo bloco estruturado de voos
  const logoCache = new Map<string, PDFImage | null>();
  if (fields.some((f) => f.source === "flights.summary")) {
    const codes = [
      ...new Set(sortedFlights(passenger).map((f) => f.airlineCode).filter(Boolean)),
    ];
    if (codes.length > 0) {
      const airlines = await db.airline.findMany({
        where: { code: { in: codes }, logoPath: { not: "" } },
      });
      for (const airline of airlines) {
        try {
          const data = await readUpload(airline.logoPath);
          const isPng = airline.logoPath.toLowerCase().endsWith(".png");
          logoCache.set(
            airline.code,
            isPng ? await doc.embedPng(data) : await doc.embedJpg(data)
          );
        } catch {
          logoCache.set(airline.code, null);
        }
      }
    }
  }

  const pages = doc.getPages();
  for (const field of fields) {
    const page = pages[field.page] ?? pages[0];
    if (!page) continue;
    const { width, height } = page.getSize();

    // "Voos (bloco com todos os trechos)": desenha os cartões estruturados
    // em vez de texto corrido
    if (field.source === "flights.summary") {
      const flights = sortedFlights(passenger);
      if (flights.length === 0) continue;
      const xPt = width * field.x;
      // largura espelhando a margem esquerda; nunca menor que 260pt
      let blockW = Math.max(width - 2 * xPt, 260);
      blockW = Math.min(blockW, width - xPt - 8);
      drawFlightsBlock({
        page,
        flights,
        x: xPt,
        yTop: height * (1 - field.y),
        width: blockW,
        baseSize: field.size || 11,
        font,
        bold,
        accent,
        logos: logoCache,
      });
      continue;
    }

    const value = resolveFieldValue(field, passenger, trip);
    if (!value) continue;

    const f = field.bold ? bold : font;
    const size = field.size || 10;
    const color = hexToRgb(field.color || "#0f172a");
    const lines = sanitize(value).split("\n");
    // field.y é o TOPO do texto (como no editor); pdf-lib usa baseline a
    // partir da base da página
    let baseline = height * (1 - field.y) - size;
    for (const line of lines) {
      if (baseline < 8) break;
      page.drawText(line, {
        x: width * field.x,
        y: baseline,
        size,
        font: f,
        color,
      });
      baseline -= size * 1.4;
    }
  }

  return doc.save();
}

export async function generateVoucherPdf(
  templateId: string,
  passengerId: string
): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const template = await db.voucherTemplate.findUnique({
    where: { id: templateId },
    include: { trip: true },
  });
  if (!template) return null;

  const passenger = await loadPassengerForVoucher(passengerId);
  if (!passenger || passenger.tripId !== template.tripId || passenger.blocked) {
    return null;
  }

  const trip = template.trip;

  const safeFileName = () => {
    const clean = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, "_");
    return `${clean(template.name)}_${clean(passenger.name)}.pdf`;
  };

  // Modo "template PDF": imprime os campos posicionados sobre o PDF enviado
  if (template.backgroundPdfPath) {
    try {
      const bytes = await generateOverlayVoucher(template, passenger, trip);
      return { bytes, fileName: safeFileName() };
    } catch (e) {
      console.error("Overlay voucher error:", e);
      return null;
    }
  }
  let sections: VoucherSectionConfig[] = [];
  try {
    sections = JSON.parse(template.sections || "[]");
  } catch {
    sections = [];
  }
  if (sections.length === 0) {
    sections = [{ key: "passenger" }, { key: "flights" }, { key: "accommodation" }];
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const accent = hexToRgb(template.accentColor || trip.primaryColor);

  const ctx: Ctx = { doc, page: doc.addPage(A4), y: 0, font, bold, accent };

  // ---------- Cabeçalho ----------
  const headerH = 110;
  ctx.page.drawRectangle({
    x: 0,
    y: A4[1] - headerH,
    width: A4[0],
    height: headerH,
    color: accent,
  });

  // Logo (template ou da viagem)
  const logoPath = template.logoPath || trip.logoPath;
  if (logoPath) {
    try {
      const data = await readUpload(logoPath);
      const isPng = logoPath.toLowerCase().endsWith(".png");
      const img = isPng ? await doc.embedPng(data) : await doc.embedJpg(data);
      const maxH = 48;
      const scale = maxH / img.height;
      ctx.page.drawImage(img, {
        x: A4[0] - MARGIN - img.width * scale,
        y: A4[1] - 34 - maxH,
        width: img.width * scale,
        height: maxH,
      });
    } catch {
      // logo indisponível — segue sem
    }
  }

  ctx.page.drawText(sanitize(trip.clientName).toUpperCase(), {
    x: MARGIN,
    y: A4[1] - 40,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
    opacity: 0.85,
  });
  ctx.page.drawText(sanitize(template.name), {
    x: MARGIN,
    y: A4[1] - 62,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText(sanitize(trip.name), {
    x: MARGIN,
    y: A4[1] - 80,
    size: 10,
    font,
    color: rgb(1, 1, 1),
    opacity: 0.9,
  });

  ctx.y = A4[1] - headerH - 24;

  if (template.headerText) {
    drawParagraph(ctx, template.headerText, 9);
    ctx.y -= 6;
  }

  // ---------- Seções ----------
  for (const section of sections) {
    switch (section.key) {
      case "passenger": {
        drawSectionTitle(ctx, section.title || "Dados do passageiro");
        drawKeyValueGrid(ctx, [
          ["Nome", passenger.name],
          ["CPF", passenger.cpf ? formatCpf(passenger.cpf) : "-"],
          ["Passaporte", passenger.passportNumber || "-"],
          ["Nascimento", formatDateBR(passenger.birthDate)],
          ["Categoria", passenger.category || "-"],
          ["Grupo", passenger.group?.name ?? "-"],
        ]);
        break;
      }
      case "flights": {
        const flights = sortedFlights(passenger);
        if (flights.length === 0) break;
        drawSectionTitle(ctx, section.title || "Voos");

        // logos das cias aéreas presentes nos voos (cache por código)
        const logoCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>> | null>();
        const airlineLogos = await db.airline.findMany({
          where: {
            code: { in: [...new Set(flights.map((f) => f.airlineCode).filter(Boolean))] },
            logoPath: { not: "" },
          },
        });
        for (const airline of airlineLogos) {
          try {
            const data = await readUpload(airline.logoPath);
            const isPng = airline.logoPath.toLowerCase().endsWith(".png");
            logoCache.set(
              airline.code,
              isPng ? await doc.embedPng(data) : await doc.embedJpg(data)
            );
          } catch {
            logoCache.set(airline.code, null);
          }
        }

        for (const f of flights) {
          const cardH = f.operatedBy ? 64 : 52;
          ensureSpace(ctx, cardH + 8);
          // cartão do voo
          ctx.page.drawRectangle({
            x: MARGIN,
            y: ctx.y - (cardH - 8),
            width: A4[0] - MARGIN * 2,
            height: cardH,
            color: rgb(0.97, 0.98, 0.99),
            borderColor: rgb(0.89, 0.91, 0.94),
            borderWidth: 1,
          });

          // logo da companhia (se cadastrada em /admin/airlines)
          let textX = MARGIN + 12;
          const logo = logoCache.get(f.airlineCode);
          if (logo) {
            // encaixa em 46x20pt preservando a proporção da imagem
            const s = Math.min(20 / logo.height, 46 / logo.width);
            const w = logo.width * s;
            ctx.page.drawImage(logo, {
              x: MARGIN + 10,
              y: ctx.y - 16,
              width: w,
              height: logo.height * s,
            });
            textX = MARGIN + 10 + w + 8;
          }

          ctx.page.drawText(
            sanitize(`${f.flightNumber}  ·  ${f.airlineName || f.airlineCode}`),
            { x: textX, y: ctx.y - 6, size: 10, font: bold, color: rgb(0.09, 0.13, 0.2) }
          );
          ctx.page.drawText(
            sanitize(
              `${f.originIata} (${f.originName || "-"})  ->  ${f.destIata} (${f.destName || "-"})`
            ),
            { x: textX, y: ctx.y - 20, size: 9, font, color: rgb(0.2, 0.25, 0.33) }
          );
          const detail = [
            f.depDateTime ? `Partida: ${formatDateTimeBR(f.depDateTime)}` : "",
            f.arrDateTime ? `Chegada: ${formatDateTimeBR(f.arrDateTime)}` : "",
            f.seat ? `Assento: ${f.seat}` : "",
            f.locator ? `Localizador: ${f.locator}` : "",
          ]
            .filter(Boolean)
            .join("   ·   ");
          ctx.page.drawText(sanitize(detail), {
            x: textX,
            y: ctx.y - 34,
            size: 8,
            font,
            color: rgb(0.35, 0.4, 0.49),
          });
          if (f.operatedBy) {
            ctx.page.drawText(
              sanitize(
                `Este voo é comercializado pela ${f.airlineName || f.airlineCode} e operado pela ${f.operatedBy}.`
              ),
              { x: textX, y: ctx.y - 46, size: 8, font: bold, color: rgb(0.72, 0.31, 0.15) }
            );
          }
          ctx.y -= cardH + 8;
        }
        break;
      }
      case "accommodation": {
        const hotels = passenger.accommodations;
        if (hotels.length === 0) break;
        drawSectionTitle(ctx, section.title || "Hospedagem");
        for (const { accommodation: h, roomNumber, roomType } of hotels) {
          drawKeyValueGrid(ctx, [
            ["Hotel", h.name],
            ["Endereço", [h.address, h.city, h.country].filter(Boolean).join(", ")],
            ["Check-in", formatDateBR(h.checkIn)],
            ["Check-out", formatDateBR(h.checkOut)],
            ["Quarto", roomNumber || "-"],
            ["Tipo", roomType || "-"],
          ]);
        }
        break;
      }
      case "emergency": {
        if (!passenger.emergencyName && !passenger.emergencyPhone) break;
        drawSectionTitle(ctx, section.title || "Contato de emergência");
        drawKeyValueGrid(ctx, [
          ["Nome", passenger.emergencyName || "-"],
          ["Telefone", passenger.emergencyPhone || "-"],
        ]);
        break;
      }
      case "itinerary": {
        const items = await db.itineraryItem.findMany({
          where: { tripId: trip.id, audience: "TODOS", status: { not: "CANCELADO" } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          take: 40,
        });
        if (items.length === 0) break;
        drawSectionTitle(ctx, section.title || "Roteiro resumido");
        for (const item of items) {
          ensureSpace(ctx, 16);
          const dateStr = item.date ? formatDateBR(item.date) : "--";
          ctx.page.drawText(
            sanitize(`${dateStr} ${item.startTime || ""}  ${item.title}`),
            { x: MARGIN + 4, y: ctx.y, size: 8.5, font, color: rgb(0.2, 0.25, 0.33) }
          );
          ctx.y -= 14;
        }
        break;
      }
      case "freeText": {
        if (!section.content) break;
        drawSectionTitle(ctx, section.title || "Informações");
        drawParagraph(ctx, section.content);
        ctx.y -= 6;
        break;
      }
    }
  }

  // ---------- Rodapé ----------
  if (template.footerText) {
    ensureSpace(ctx, 40);
    ctx.y = Math.max(ctx.y, MARGIN + 24);
    drawParagraph(ctx, template.footerText, 7.5);
  }

  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(
      sanitize(`${trip.clientName} · ${trip.name} — página ${i + 1}/${pages.length}`),
      { x: MARGIN, y: 24, size: 7, font, color: rgb(0.55, 0.6, 0.67) }
    );
  });

  const bytes = await doc.save();
  return { bytes, fileName: safeFileName() };
}
