"use client";

import { useActionState, useState } from "react";
import { submitGuestForm, type GuestFormState } from "./actions";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui";
import { UFS } from "@/lib/constants";
import { AlertCircle, CheckCircle2, KeyRound, UserPlus } from "lucide-react";

const fileInputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand-800";

export function GuestForm({
  token,
  allowCompanion,
  welcome,
}: {
  token: string;
  allowCompanion: boolean;
  welcome: string;
}) {
  const action = submitGuestForm.bind(null, token);
  const [state, formAction] = useActionState<GuestFormState, FormData>(action, {});
  const [hasCompanion, setHasCompanion] = useState(false);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h2 className="text-lg font-bold text-slate-900">
          Inscrição enviada com sucesso!
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Seus dados foram recebidos pela organização da viagem. Acesse a{" "}
          <strong>Área do Passageiro</strong> com o seu CPF — o PIN abaixo também
          é o seu CPF, e você pode trocá-lo depois em “Meus dados”.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3">
          {state.titularPin && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3">
              <KeyRound className="h-5 w-5 text-brand-700" />
              <div className="text-left">
                <p className="text-[11px] font-bold uppercase text-slate-400">Seu PIN</p>
                <p className="font-mono text-xl font-bold tracking-widest text-slate-900">
                  {state.titularPin}
                </p>
              </div>
            </div>
          )}
          {state.companionPin && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3">
              <KeyRound className="h-5 w-5 text-violet-700" />
              <div className="text-left">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  PIN do acompanhante
                </p>
                <p className="font-mono text-xl font-bold tracking-widest text-slate-900">
                  {state.companionPin}
                </p>
              </div>
            </div>
          )}
        </div>
        <a
          href="/portal/login"
          className="mt-6 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Acessar a Área do Passageiro
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      {welcome && (
        <p className="mb-6 rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{welcome}</p>
      )}

      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
        Seus dados
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo *" className="sm:col-span-2">
          <Input name="name" required placeholder="Como consta no documento de viagem" />
        </Field>
        <Field label="E-mail *">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input name="phone" placeholder="(00) 00000-0000" />
        </Field>
        <Field label="CPF">
          <Input name="cpf" inputMode="numeric" placeholder="000.000.000-00" />
        </Field>
        <Field label="RG">
          <Input name="rg" />
        </Field>
        <Field label="Data de nascimento">
          <Input name="birthDate" type="date" />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Cidade" className="col-span-2">
            <Input name="city" />
          </Field>
          <Field label="UF">
            <Select name="uf" defaultValue="">
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Passaporte (número)">
          <Input name="passportNumber" />
        </Field>
        <Field label="Validade do passaporte">
          <Input name="passportExpiry" type="date" />
        </Field>
        <Field label="Foto do passaporte (página com dados)">
          <input type="file" name="passportFile" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileInputClass} />
        </Field>
        <Field label="Documento de identidade (RG/CNH)">
          <input type="file" name="idFile" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileInputClass} />
        </Field>
        <Field label="Alergias ou restrições alimentares" className="sm:col-span-2">
          <Textarea name="dietary" placeholder="Deixe em branco caso não possua" />
        </Field>
        <Field label="Condições médicas que a organização deva saber" className="sm:col-span-2">
          <Textarea name="medicalNotes" placeholder="Deixe em branco caso não possua" />
        </Field>
        <Field label="Contato de emergência — nome">
          <Input name="emergencyName" />
        </Field>
        <Field label="Contato de emergência — telefone">
          <Input name="emergencyPhone" />
        </Field>
      </div>

      {allowCompanion && (
        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              name="hasCompanion"
              checked={hasCompanion}
              onChange={(e) => setHasCompanion(e.target.checked)}
            />
            <UserPlus className="h-4 w-4 text-brand-700" />
            Levarei acompanhante
          </label>

          {hasCompanion && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo do acompanhante *" className="sm:col-span-2">
                <Input name="cName" required={hasCompanion} />
              </Field>
              <Field label="E-mail do acompanhante">
                <Input name="cEmail" type="email" />
              </Field>
              <Field label="Telefone do acompanhante">
                <Input name="cPhone" />
              </Field>
              <Field label="CPF do acompanhante">
                <Input name="cCpf" inputMode="numeric" />
              </Field>
              <Field label="Nascimento do acompanhante">
                <Input name="cBirthDate" type="date" />
              </Field>
              <Field label="Passaporte do acompanhante">
                <Input name="cPassportNumber" />
              </Field>
              <Field label="Validade do passaporte">
                <Input name="cPassportExpiry" type="date" />
              </Field>
              <Field label="Foto do passaporte do acompanhante">
                <input type="file" name="cPassportFile" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileInputClass} />
              </Field>
              <Field label="Alergias / restrições do acompanhante">
                <Textarea name="cDietary" />
              </Field>
            </div>
          )}
        </div>
      )}

      {state.error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <div className="mt-6">
        <SubmitButton className="w-full">Enviar inscrição</SubmitButton>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Seus dados serão utilizados exclusivamente para a organização desta viagem.
        </p>
      </div>
    </form>
  );
}
