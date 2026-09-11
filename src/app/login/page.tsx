"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { staffLogin, type LoginState } from "./actions";
import { Field, Input, SubmitButton } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(staffLogin, {});

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
          <h1 className="text-lg font-bold text-slate-900">Área da Agência</h1>
          <p className="text-sm text-slate-500">Acesse com suas credenciais</p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field label="E-mail">
            <Input name="email" type="email" autoComplete="username" required placeholder="voce@agencia.com" />
          </Field>
          <Field label="Senha">
            <Input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
          </Field>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <SubmitButton className="w-full">Entrar</SubmitButton>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          É passageiro?{" "}
          <Link href="/portal/login" className="font-semibold text-brand-700 hover:underline">
            Acesse a área do passageiro
          </Link>
        </p>
      </div>
    </main>
  );
}
