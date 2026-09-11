"use client";

import { useActionState } from "react";
import {
  upsertAirline, deleteAirline, upsertAirport, deleteAirport, type ActionState,
} from "@/app/admin/t/[tripId]/flights/actions";
import {
  Button, Card, CardBody, Field, Input, SubmitButton, Table, Td, Th,
} from "@/components/ui";
import { AlertCircle, Plane, Trash2 } from "lucide-react";

type Airline = { code: string; name: string; hasLogo: boolean };
type Airport = { iata: string; name: string; city: string; country: string };

export function AirlinesClient({
  airlines,
  airports,
  canWrite,
}: {
  airlines: Airline[];
  airports: Airport[];
  canWrite: boolean;
}) {
  const [aState, airlineAction] = useActionState<ActionState, FormData>(upsertAirline, {});
  const [pState, airportAction] = useActionState<ActionState, FormData>(upsertAirport, {});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">Companhias aéreas</h2>
        {canWrite && (
          <Card className="mb-4">
            <CardBody className="p-4">
              <form action={airlineAction} className="flex flex-wrap items-end gap-2">
                <Field label="Código" className="w-20">
                  <Input name="code" maxLength={3} placeholder="LA" required />
                </Field>
                <Field label="Nome" className="min-w-40 flex-1">
                  <Input name="name" placeholder="LATAM Airlines" required />
                </Field>
                <Field label="Logo" className="w-44">
                  <Input name="logo" type="file" accept="image/*" className="py-1.5 text-xs" />
                </Field>
                <SubmitButton size="sm">Salvar</SubmitButton>
              </form>
              {aState.error && (
                <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {aState.error}
                </p>
              )}
            </CardBody>
          </Card>
        )}
        <Table>
          <thead>
            <tr>
              <Th>Logo</Th>
              <Th>Código</Th>
              <Th>Companhia</Th>
              {canWrite && <Th className="w-12"></Th>}
            </tr>
          </thead>
          <tbody>
            {airlines.map((a) => (
              <tr key={a.code} className="hover:bg-slate-50">
                <Td>
                  {a.hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/airline-logo/${a.code}`}
                      alt={a.name}
                      className="h-7 w-7 rounded object-contain"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100">
                      <Plane className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  )}
                </Td>
                <Td className="font-mono font-bold">{a.code}</Td>
                <Td>{a.name}</Td>
                {canWrite && (
                  <Td>
                    <form action={deleteAirline.bind(null, a.code)}>
                      <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">Aeroportos</h2>
        {canWrite && (
          <Card className="mb-4">
            <CardBody className="p-4">
              <form action={airportAction} className="flex flex-wrap items-end gap-2">
                <Field label="IATA" className="w-20">
                  <Input name="iata" maxLength={3} placeholder="GRU" required />
                </Field>
                <Field label="Nome" className="min-w-36 flex-1">
                  <Input name="name" placeholder="Aeroporto de Guarulhos" required />
                </Field>
                <Field label="Cidade" className="w-32">
                  <Input name="city" placeholder="São Paulo" />
                </Field>
                <Field label="País" className="w-28">
                  <Input name="country" placeholder="Brasil" />
                </Field>
                <SubmitButton size="sm">Salvar</SubmitButton>
              </form>
              {pState.error && (
                <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {pState.error}
                </p>
              )}
            </CardBody>
          </Card>
        )}
        <Table>
          <thead>
            <tr>
              <Th>IATA</Th>
              <Th>Aeroporto</Th>
              <Th>Cidade / País</Th>
              {canWrite && <Th className="w-12"></Th>}
            </tr>
          </thead>
          <tbody>
            {airports.map((a) => (
              <tr key={a.iata} className="hover:bg-slate-50">
                <Td className="font-mono font-bold">{a.iata}</Td>
                <Td>{a.name}</Td>
                <Td>{[a.city, a.country].filter(Boolean).join(", ") || "—"}</Td>
                {canWrite && (
                  <Td>
                    <form action={deleteAirport.bind(null, a.iata)}>
                      <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
