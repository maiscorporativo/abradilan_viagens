"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { associateLogin, type AssociateLoginState } from "./actions";
import { Field, Input, SubmitButton } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function AssociateLoginPage() {
  const [state, formAction] = useActionState<AssociateLoginState, FormData>(
    associateLogin,
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
          <h1 className="text-lg font-bold text-slate-900">Área do Associado</h1>
          <p className="text-sm text-slate-500">
            Aéreo, eventos e linha direta de viagens em um só lugar.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field label="E-mail">
            <Input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="voce@empresa.com.br"
            />
          </Field>
          <Field label="Senha">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </Field>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}

          <SubmitButton className="w-full">Entrar</SubmitButton>
        </form>

        <div className="mt-6 space-y-1 text-center text-xs text-slate-400">
          <p>
            Convidado de um evento?{" "}
            <Link href="/empresa/login" className="font-semibold text-brand-700 hover:underline">
              Acesse com o login da sua empresa
            </Link>
          </p>
          <p>
            Passageiro de uma viagem?{" "}
            <Link href="/portal/login" className="font-semibold text-brand-700 hover:underline">
              Entre com CPF e PIN
            </Link>
          </p>
        </div>
      </div>

      <p className="fixed bottom-4 text-center text-[11px] text-white/70">
        Portal ABRADILAN · operado por Mais Corporativo
      </p>
    </main>
  );
}
