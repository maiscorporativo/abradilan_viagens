"use client";

import { useActionState } from "react";
import { changePin, updateContact, type ActionState } from "./actions";
import {
  Card, CardBody, Field, Input, SubmitButton, Textarea,
} from "@/components/ui";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> Salvo com sucesso.
      </p>
    );
  }
  return null;
}

export function DadosClient({
  contact,
  pinIsCpf,
}: {
  contact: {
    email: string;
    phone: string;
    emergencyName: string;
    emergencyPhone: string;
    dietary: string;
  };
  pinIsCpf: boolean;
}) {
  const [contactState, contactAction] = useActionState<ActionState, FormData>(
    updateContact,
    {}
  );
  const [pinState, pinAction] = useActionState<ActionState, FormData>(changePin, {});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Contato e informações que você pode atualizar
          </h2>
          <form action={contactAction} className="space-y-4">
            <Field label="E-mail">
              <Input name="email" type="email" defaultValue={contact.email} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input name="phone" defaultValue={contact.phone} />
            </Field>
            <Field label="Contato de emergência — nome">
              <Input name="emergencyName" defaultValue={contact.emergencyName} />
            </Field>
            <Field label="Contato de emergência — telefone">
              <Input name="emergencyPhone" defaultValue={contact.emergencyPhone} />
            </Field>
            <Field label="Alergias / restrições alimentares">
              <Textarea name="dietary" defaultValue={contact.dietary} />
            </Field>
            <Feedback state={contactState} />
            <SubmitButton>Salvar</SubmitButton>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <KeyRound className="h-4 w-4 text-brand-700" /> Alterar meu PIN
          </h2>
          {pinIsCpf && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Seu PIN ainda é o seu CPF. Para mais segurança, escolha um PIN só
              seu — é ele que protege seus documentos e dados da viagem.
            </p>
          )}
          <form action={pinAction} className="space-y-4">
            <Field label="PIN atual">
              <Input name="current" type="password" required />
            </Field>
            <Field label="Novo PIN (mín. 4 dígitos)">
              <Input name="next" type="password" required minLength={4} />
            </Field>
            <Field label="Confirmar novo PIN">
              <Input name="confirm" type="password" required minLength={4} />
            </Field>
            <Feedback state={pinState} />
            <SubmitButton>Alterar PIN</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
