"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { parseDateInput } from "@/lib/utils";
import { recordStage, notifyStageChange } from "@/lib/travel-notify";

export type QuoteActionState = { error?: string; ok?: boolean; info?: string };

async function requireQuoteWriter() {
  const session = await requireStaff();
  if (!canWrite(session.role)) throw new Error("Sem permissão para esta ação.");
  return session;
}

/**
 * Assume o atendimento: registra a etapa, marca o responsável e avisa o
 * associado de que alguém pegou o pedido.
 */
export async function takeRequest(requestId: string): Promise<QuoteActionState> {
  const session = await requireQuoteWriter();

  const request = await db.travelRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  if (!request) return { error: "Solicitação não encontrada." };
  if (request.status !== "NOVO") {
    return { error: "Esta solicitação já saiu da fila de novos." };
  }

  await db.travelRequest.update({
    where: { id: requestId },
    data: { status: "EM_ATENDIMENTO", handledBy: session.name },
  });
  await recordStage({
    requestId,
    status: "EM_ATENDIMENTO",
    actorName: session.name,
    actorType: "STAFF",
  });
  const log = await notifyStageChange(requestId);

  revalidatePath("/admin/solicitacoes");
  return { ok: true, info: log };
}

export async function saveQuote(
  requestId: string,
  quoteId: string | null,
  _prev: QuoteActionState,
  formData: FormData
): Promise<QuoteActionState> {
  const session = await requireQuoteWriter();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const title = get("title");
  if (!title) return { error: "Dê um nome à opção (ex.: “Latam direto”)." };

  // Vírgula decimal é o que o operador digita; o banco guarda número.
  const money = (k: string) => {
    const raw = get(k).replace(/\./g, "").replace(",", ".");
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const data = {
    title,
    description: get("description"),
    currency: get("currency") || "BRL",
    totalAmount: money("totalAmount"),
    perPaxAmount: money("perPaxAmount"),
    validUntil: parseDateInput(get("validUntil")),
    createdBy: session.name,
  };

  if (quoteId) {
    await db.travelQuote.update({ where: { id: quoteId }, data });
  } else {
    const count = await db.travelQuote.count({ where: { requestId } });
    await db.travelQuote.create({
      data: { ...data, requestId, sortOrder: count },
    });
  }

  revalidatePath("/admin/solicitacoes");
  return { ok: true };
}

export async function deleteQuote(quoteId: string) {
  await requireQuoteWriter();
  const quote = await db.travelQuote.findUnique({
    where: { id: quoteId },
    select: { requestId: true },
  });
  await db.travelQuote.delete({ where: { id: quoteId } });

  // Se a opção apagada era a escolhida, a solicitação volta a aguardar decisão.
  if (quote) {
    await db.travelRequest.updateMany({
      where: { id: quote.requestId, chosenQuoteId: quoteId },
      data: { chosenQuoteId: null, decidedAt: null, status: "COTADO" },
    });
  }
  revalidatePath("/admin/solicitacoes");
}

/**
 * Publica as opções ao associado: muda a etapa para COTADO e dispara o aviso
 * com o resumo dos valores. É o momento em que a bola passa para o cliente.
 */
export async function publishQuotes(
  requestId: string,
  note: string
): Promise<QuoteActionState> {
  const session = await requireQuoteWriter();

  const count = await db.travelQuote.count({ where: { requestId } });
  if (count === 0) {
    return { error: "Cadastre ao menos uma opção antes de publicar." };
  }

  await db.travelRequest.update({
    where: { id: requestId },
    data: { status: "COTADO", handledBy: session.name },
  });
  await recordStage({
    requestId,
    status: "COTADO",
    note: note || `${count} opção(ões) enviada(s) ao associado.`,
    actorName: session.name,
    actorType: "STAFF",
  });
  const log = await notifyStageChange(requestId);

  revalidatePath("/admin/solicitacoes");
  return { ok: true, info: log };
}

/** Muda a etapa manualmente (inclusive para trás) e avisa o associado. */
export async function changeStage(
  requestId: string,
  status: string,
  note: string
): Promise<QuoteActionState> {
  const session = await requireQuoteWriter();

  const valid = ["NOVO", "EM_ATENDIMENTO", "COTADO", "FECHADO", "CANCELADO"];
  if (!valid.includes(status)) return { error: "Etapa inválida." };

  await db.travelRequest.update({
    where: { id: requestId },
    data: {
      status,
      handledBy: status === "NOVO" ? "" : session.name,
    },
  });
  await recordStage({
    requestId,
    status,
    note,
    actorName: session.name,
    actorType: "STAFF",
  });
  const log = await notifyStageChange(requestId);

  revalidatePath("/admin/solicitacoes");
  return { ok: true, info: log };
}
