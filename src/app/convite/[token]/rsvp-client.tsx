"use client";

import { useState, useTransition, useEffect } from "react";
import { respondToInvite } from "./actions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * Botões de RSVP. Também trata o `?confirmar=1` dos e-mails: a confirmação é
 * disparada aqui, no cliente, e nunca pelo GET do link — assim scanners de
 * segurança que pré-carregam links não confirmam presenças sozinhos.
 */
export function RsvpClient({
  token,
  initialStatus,
  autoConfirm,
  primaryColor,
}: {
  token: string;
  initialStatus: string;
  autoConfirm: boolean;
  primaryColor: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (answer: "CONFIRMADO" | "RECUSADO") => {
    startTransition(async () => {
      const result = await respondToInvite(token, answer);
      if (result.error) setError(result.error);
      else if (result.status) setStatus(result.status);
    });
  };

  useEffect(() => {
    if (autoConfirm && initialStatus !== "CONFIRMADO" && initialStatus !== "CREDENCIADO") {
      respond("CONFIRMADO");
    }
    // Roda uma única vez, na chegada pelo link do e-mail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "CREDENCIADO") {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Presença já registrada no evento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status === "CONFIRMADO" ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Presença confirmada. Até lá!
        </p>
      ) : status === "RECUSADO" ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
          <XCircle className="h-4 w-4" /> Você informou que não poderá comparecer.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {status !== "CONFIRMADO" && (
          <button
            onClick={() => respond("CONFIRMADO")}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmar minha presença
          </button>
        )}
        {status !== "RECUSADO" && (
          <button
            onClick={() => respond("RECUSADO")}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" /> Não poderei comparecer
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
    </div>
  );
}
