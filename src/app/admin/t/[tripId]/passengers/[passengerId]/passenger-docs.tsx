"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  uploadPassengerDocument, deletePassengerDocument, type ActionState,
} from "../actions";
import { Card, CardBody, Select, SubmitButton } from "@/components/ui";
import { DOC_KINDS } from "@/lib/constants";
import { AlertCircle, Download, FileText, Trash2, Upload } from "lucide-react";

export type DocRow = {
  id: string;
  kind: string;
  fileName: string;
  size: number;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function PassengerDocs({
  tripId,
  passengerId,
  docs,
  canWrite,
}: {
  tripId: string;
  passengerId: string;
  docs: DocRow[];
  canWrite: boolean;
}) {
  const action = uploadPassengerDocument.bind(null, tripId, passengerId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardBody>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
          <FileText className="h-4 w-4 text-brand-700" /> Documentos
        </h2>

        {docs.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum documento anexado.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {d.fileName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {d.kind} · {formatSize(d.size)} · {d.createdAt}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={`/api/files/passenger-doc/${d.id}`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-brand-700"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {canWrite && (
                    <form
                      action={deletePassengerDocument.bind(null, tripId, passengerId, d.id)}
                    >
                      <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-rose-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canWrite && (
          <form ref={formRef} action={formAction} className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Select name="kind" className="w-40">
                {Object.entries(DOC_KINDS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <input
                type="file"
                name="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
              />
            </div>
            {state.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
              </p>
            )}
            <SubmitButton size="sm" variant="outline">
              <Upload className="h-3.5 w-3.5" /> Anexar documento
            </SubmitButton>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
