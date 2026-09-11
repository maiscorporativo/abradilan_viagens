"use client";

import { useActionState } from "react";
import { createTrip, type ActionState } from "../actions";
import { Card, CardBody, Field, Input, PageHeader, SubmitButton, Textarea } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function NewTripPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(createTrip, {});

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nova viagem de incentivo"
        subtitle="Defina os dados básicos — tudo pode ser ajustado depois nas configurações."
      />
      <Card>
        <CardBody>
          <form action={formAction} className="space-y-4">
            <Field label="Nome da viagem *">
              <Input name="name" required placeholder="Ex.: Convenção 2027 — Cancún" />
            </Field>
            <Field label="Cliente (empresa) *">
              <Input name="clientName" required placeholder="Ex.: Britânia Eletrodomésticos" />
            </Field>
            <Field label="Destino">
              <Input name="destination" placeholder="Ex.: Cancún, México" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Início">
                <Input name="startDate" type="date" />
              </Field>
              <Field label="Fim">
                <Input name="endDate" type="date" />
              </Field>
            </div>
            <Field label="Cor principal (identidade da viagem)">
              <Input name="primaryColor" type="color" defaultValue="#002042" className="h-10 w-24 p-1" />
            </Field>
            <Field label="Descrição">
              <Textarea name="description" placeholder="Observações internas sobre a viagem…" />
            </Field>

            {state.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
              </p>
            )}

            <div className="flex justify-end">
              <SubmitButton>Criar viagem</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
