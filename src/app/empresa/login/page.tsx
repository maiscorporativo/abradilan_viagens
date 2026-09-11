"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { companyLogin, type CompanyLoginState } from "./actions";
import { Field, Input, SubmitButton } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function CompanyLoginPage() {
  const [state, formAction] = useActionState<CompanyLoginState, FormData>(
    companyLogin,
    {}
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sun-600 via-sun-500 to-brand-700 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <Image
            src="/logo-abradilan.png"
            alt="ABRADILAN"
            width={186}
            height={51}
            priority
            className="mx-auto mb-4 h-auto w-40"
          />
          <h1 className="text-lg font-bold text-slate-900">Convites da sua empresa</h1>
          <p className="text-sm text-slate-500">
            Use o login e a senha que você recebeu junto com o convite.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field label="Login">
            <Input name="login" autoComplete="username" required />
          </Field>
          <Field label="Senha">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <SubmitButton className="w-full">Entrar</SubmitButton>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          É associado ABRADILAN?{" "}
          <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
            Acesse a área do associado
          </Link>
        </p>
      </div>
    </main>
  );
}
