"use client";

import { useActionState } from "react";
import { changeAssociatePassword, type ChangePasswordState } from "./actions";
import { Card, CardBody, Field, Input, SubmitButton } from "@/components/ui";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function SenhaClient({ mustChange }: { mustChange: boolean }) {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changeAssociatePassword,
    {}
  );

  return (
    <Card className="max-w-md">
      <CardBody>
        {mustChange && !state.success && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Este é o seu primeiro acesso. Defina uma senha pessoal antes de continuar.
          </p>
        )}

        <form action={formAction} className="space-y-4">
          <Field label="Senha atual">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Nova senha (mínimo 8 caracteres)">
            <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Confirme a nova senha">
            <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          </Field>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}
          {state.success && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.success}
            </p>
          )}

          <SubmitButton>Salvar nova senha</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
