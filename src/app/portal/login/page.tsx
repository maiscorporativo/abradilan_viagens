"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { passengerLogin, type PassengerLoginState } from "./actions";
import { Field, Input, SubmitButton } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function PassengerLoginPage() {
  const [state, formAction] = useActionState<PassengerLoginState, FormData>(
    passengerLogin,
    {}
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <Image
            src="/logo-mais.png"
            alt="Mais Corporativo"
            width={180}
            height={60}
            priority
            className="mx-auto mb-4 h-auto w-44"
          />
          <h1 className="text-lg font-bold text-slate-900">Área do Passageiro</h1>
          <p className="text-sm text-slate-500">
            Entre com o seu CPF. No primeiro acesso, o PIN também é o seu CPF.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field label="CPF">
            <Input name="cpf" inputMode="numeric" required placeholder="000.000.000-00" />
          </Field>
          <Field label="PIN (no primeiro acesso, o seu CPF)">
            <Input name="pin" type="password" inputMode="numeric" required placeholder="••••••" />
          </Field>

          {state.choices && state.choices.length > 0 && (
            <Field label="Você participa de mais de uma viagem. Escolha:">
              <div className="space-y-2">
                {state.choices.map((c) => (
                  <label
                    key={c.passengerId}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400"
                  >
                    <input type="radio" name="passengerId" value={c.passengerId} required />
                    {c.tripName}
                  </label>
                ))}
              </div>
            </Field>
          )}

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <SubmitButton className="w-full">Entrar</SubmitButton>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          É da agência?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Acesse a área administrativa
          </Link>
        </p>
      </div>
    </main>
  );
}
