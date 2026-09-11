"use client";

import { STAGE_FLOW, STAGE_DESCRIPTION, TRAVEL_REQUEST_STATUS } from "@/lib/constants";
import { formatDateTimeBR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Check, Circle, Ban } from "lucide-react";

export type StageEvent = {
  status: string;
  note: string;
  actorName: string;
  createdAt: string;
};

/**
 * Régua de etapas da solicitação. A mesma peça serve ao atendente e ao
 * associado — o que muda é só o texto de apoio, para que os dois lados vejam
 * exatamente o mesmo estágio.
 *
 * CANCELADO não é uma etapa do fluxo: quando acontece, substitui a régua.
 */
export function RequestTimeline({
  status,
  events,
  audience = "ASSOCIADO",
}: {
  status: string;
  events: StageEvent[];
  audience?: "ASSOCIADO" | "STAFF";
}) {
  const firstAt = (stage: string) =>
    events.find((e) => e.status === stage)?.createdAt ?? null;

  if (status === "CANCELADO") {
    const at = firstAt("CANCELADO");
    const evento = events.find((e) => e.status === "CANCELADO");
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
          <Ban className="h-4 w-4" /> Solicitação cancelada
        </p>
        {at && (
          <p className="mt-0.5 text-xs text-rose-700">
            {formatDateTimeBR(at)}
            {evento?.actorName ? ` · por ${evento.actorName}` : ""}
          </p>
        )}
        {evento?.note && (
          <p className="mt-1 text-sm text-rose-700">{evento.note}</p>
        )}
      </div>
    );
  }

  const currentIndex = STAGE_FLOW.indexOf(status as (typeof STAGE_FLOW)[number]);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-2">
      {STAGE_FLOW.map((stage, i) => {
        const done = currentIndex > i;
        const current = currentIndex === i;
        const at = firstAt(stage);

        return (
          <li key={stage} className="flex flex-1 gap-3 sm:flex-col sm:gap-0">
            {/* Trilho: vertical no celular, horizontal no desktop */}
            <div className="flex flex-col items-center sm:flex-row sm:w-full">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                  done && "border-brand-600 bg-brand-600 text-white",
                  current && "border-brand-600 bg-white text-brand-700",
                  !done && !current && "border-slate-200 bg-white text-slate-300"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : current ? (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "w-0.5 flex-1 sm:h-0.5 sm:w-full",
                  i === STAGE_FLOW.length - 1 && "sm:hidden",
                  done ? "bg-brand-600" : "bg-slate-200"
                )}
              />
            </div>

            <div className="pb-5 sm:pb-0 sm:pt-2 sm:pr-3">
              <p
                className={cn(
                  "text-sm font-bold",
                  done || current ? "text-slate-900" : "text-slate-400"
                )}
              >
                {TRAVEL_REQUEST_STATUS[stage] ?? stage}
              </p>
              {at ? (
                <p className="text-[11px] text-slate-400">{formatDateTimeBR(at)}</p>
              ) : (
                <p className="text-[11px] text-slate-300">aguardando</p>
              )}
              {current && (
                <p className="mt-1 text-xs text-slate-500">
                  {audience === "STAFF"
                    ? staffHint(stage)
                    : STAGE_DESCRIPTION[stage] ?? ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** O mesmo estágio, dito do ponto de vista de quem opera. */
function staffHint(stage: string) {
  switch (stage) {
    case "NOVO":
      return "Aguardando alguém assumir o atendimento.";
    case "EM_ATENDIMENTO":
      return "Monte as opções de cotação e publique para o associado.";
    case "COTADO":
      return "Aguardando o associado escolher uma das opções.";
    case "FECHADO":
      return "Opção escolhida — siga com a emissão.";
    default:
      return "";
  }
}
