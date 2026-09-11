"use client";

import { useEffect, useRef } from "react";

/**
 * Fecha um modal quando a server action confirma sucesso.
 *
 * Recebe um **token que muda a cada sucesso** (`savedAt`), e não um booleano.
 * Com booleano o efeito só dispararia na primeira transição false→true: da
 * segunda gravação em diante `ok` já valia `true`, o efeito não reexecutava e o
 * modal ficava aberto sem sinal nenhum — dando a impressão de que a edição não
 * havia sido salva, embora estivesse gravada.
 */
export function CloseOnSuccess({
  savedAt,
  onClose,
}: {
  savedAt: number | undefined;
  onClose: () => void;
}) {
  const lastHandled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!savedAt || savedAt === lastHandled.current) return;
    lastHandled.current = savedAt;
    onClose();
    // `onClose` é recriada a cada render; o token é o único gatilho legítimo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  return null;
}
