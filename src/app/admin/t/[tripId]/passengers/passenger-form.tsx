"use client";

import { useActionState, useState } from "react";
import { createPassenger, updatePassenger, type ActionState } from "./actions";
import {
  Card, CardBody, Field, Input, Select, SubmitButton, Textarea,
} from "@/components/ui";
import { RSVP_STATUS, UFS } from "@/lib/constants";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export type PassengerFormData = {
  id?: string;
  type: string;
  titularId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  birthDate: string;
  passportNumber: string;
  passportExpiry: string;
  city: string;
  uf: string;
  category: string;
  groupId: string;
  dietary: string;
  medicalNotes: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  rsvpStatus: string;
  blocked: boolean;
};

export function PassengerForm({
  tripId,
  passenger,
  titulars,
  groups,
}: {
  tripId: string;
  passenger?: PassengerFormData;
  titulars: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}) {
  const action = passenger?.id
    ? updatePassenger.bind(null, tripId, passenger.id)
    : createPassenger.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [type, setType] = useState(passenger?.type ?? "TITULAR");

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo *">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="TITULAR">Titular</option>
                <option value="ACOMPANHANTE">Acompanhante</option>
              </Select>
            </Field>
            {type === "ACOMPANHANTE" && (
              <Field label="Titular vinculado *">
                <Select name="titularId" defaultValue={passenger?.titularId ?? ""} required>
                  <option value="">Selecione…</option>
                  {titulars
                    .filter((t) => t.id !== passenger?.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </Select>
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *" className="sm:col-span-2">
              <Input name="name" required defaultValue={passenger?.name} />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" defaultValue={passenger?.email} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input name="phone" defaultValue={passenger?.phone} />
            </Field>
            <Field label="CPF">
              <Input name="cpf" inputMode="numeric" defaultValue={passenger?.cpf} />
            </Field>
            <Field label="RG">
              <Input name="rg" defaultValue={passenger?.rg} />
            </Field>
            <Field label="Data de nascimento">
              <Input name="birthDate" type="date" defaultValue={passenger?.birthDate} />
            </Field>
            <Field label="Categoria (ex.: Diretoria, Cliente, Staff)">
              <Input name="category" defaultValue={passenger?.category} list="cat-suggestions" />
            </Field>
            <Field label="Passaporte (número)">
              <Input name="passportNumber" defaultValue={passenger?.passportNumber} />
            </Field>
            <Field label="Validade do passaporte">
              <Input name="passportExpiry" type="date" defaultValue={passenger?.passportExpiry} />
            </Field>
            <Field label="Cidade de origem">
              <Input name="city" defaultValue={passenger?.city} />
            </Field>
            <Field label="UF">
              <Select name="uf" defaultValue={passenger?.uf ?? ""}>
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </Select>
            </Field>
            <Field label="Grupo">
              <Select name="groupId" defaultValue={passenger?.groupId ?? ""}>
                <option value="">Sem grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status RSVP">
              <Select name="rsvpStatus" defaultValue={passenger?.rsvpStatus ?? "PENDENTE"}>
                {Object.entries(RSVP_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alergias / restrições alimentares">
              <Textarea name="dietary" defaultValue={passenger?.dietary} />
            </Field>
            <Field label="Condições médicas / observações de saúde">
              <Textarea name="medicalNotes" defaultValue={passenger?.medicalNotes} />
            </Field>
            <Field label="Contato de emergência — nome">
              <Input name="emergencyName" defaultValue={passenger?.emergencyName} />
            </Field>
            <Field label="Contato de emergência — telefone">
              <Input name="emergencyPhone" defaultValue={passenger?.emergencyPhone} />
            </Field>
            <Field label="Observações internas" className="sm:col-span-2">
              <Textarea name="notes" defaultValue={passenger?.notes} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="blocked" defaultChecked={passenger?.blocked} />
            Bloquear acesso ao portal e geração de vouchers
          </label>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Dados salvos com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton>
              {passenger?.id ? "Salvar alterações" : "Cadastrar passageiro"}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
