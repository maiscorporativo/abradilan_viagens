"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadTripDocument, deleteTripDocument, type ActionState } from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Field, Input, Select,
  SubmitButton, Table, Td, Th,
} from "@/components/ui";
import { TRIP_DOC_CATEGORIES } from "@/lib/constants";
import { AlertCircle, Download, FolderOpen, Trash2, Upload } from "lucide-react";

export type DocRow = {
  id: string;
  title: string;
  category: string;
  fileName: string;
  size: number;
  passengerName: string | null;
  visibleToPassenger: boolean;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DocumentsClient({
  tripId,
  docs,
  passengers,
  canWrite,
}: {
  tripId: string;
  docs: DocRow[];
  passengers: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const action = uploadTripDocument.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card>
          <CardBody className="p-4">
            <form
              ref={formRef}
              action={formAction}
              className="flex flex-wrap items-end gap-3"
            >
              <Field label="Título *" className="min-w-44 flex-1">
                <Input name="title" required placeholder="Ex.: Apólice do seguro viagem" />
              </Field>
              <Field label="Categoria" className="w-36">
                <Select name="category">
                  {Object.entries(TRIP_DOC_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Destinatário" className="w-52">
                <Select name="passengerId" defaultValue="">
                  <option value="">Todos (documento geral)</option>
                  {passengers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Arquivo *" className="w-60">
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" name="visibleToPassenger" defaultChecked />
                Visível no portal
              </label>
              <SubmitButton size="sm">
                <Upload className="h-3.5 w-3.5" /> Enviar
              </SubmitButton>
            </form>
            {state.error && (
              <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {docs.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10" />}
          title="Nenhum documento"
          description="Envie vouchers, apólices, ingressos e demais arquivos da viagem."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Documento</Th>
              <Th>Categoria</Th>
              <Th>Destinatário</Th>
              <Th>Portal</Th>
              <Th>Enviado em</Th>
              <Th className="w-20"></Th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-900">{d.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {d.fileName} · {formatSize(d.size)}
                  </p>
                </Td>
                <Td>{d.category}</Td>
                <Td>{d.passengerName ?? <Badge tone="teal">Todos</Badge>}</Td>
                <Td>
                  <Badge tone={d.visibleToPassenger ? "green" : "slate"}>
                    {d.visibleToPassenger ? "Visível" : "Interno"}
                  </Badge>
                </Td>
                <Td>{d.createdAt}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/files/trip-doc/${d.id}`}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canWrite && (
                      <form action={deleteTripDocument.bind(null, tripId, d.id)}>
                        <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
