"use client";

import { useActionState, useState } from "react";
import {
  updateEventSettings, type EventSettingsState,
} from "./event-actions";
import {
  Button, Card, CardBody, Field, Input, Select, SubmitButton, Textarea,
} from "@/components/ui";
import { TRIP_KINDS } from "@/lib/constants";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";

export type EventSettingsData = {
  id: string;
  kind: string;
  invitesEnabled: boolean;
  tablesEnabled: boolean;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
  inviteDeadline: string;
  replyTo: string;
  emailTitle: string;
  emailText: string;
  emailFooter: string;
  whatsappTemplate: string;
  cancelTemplate: string;
  showAgencyLogo: boolean;
  hotels: { nome?: string; endereco?: string; telefone?: string; distancia?: string }[];
  facilities: { titulo?: string; descricao?: string }[];
};

/** Lista dinâmica de linhas (hotéis / comodidades) enviada como campos indexados. */
function DynamicList<T extends Record<string, string | undefined>>({
  label,
  prefix,
  fields,
  initial,
  disabled,
}: {
  label: string;
  prefix: string;
  fields: { key: string; label: string }[];
  initial: T[];
  disabled: boolean;
}) {
  const [rows, setRows] = useState<T[]>(initial.length ? initial : ([] as T[]));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRows((r) => [...r, {} as T])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        )}
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-slate-400">Nenhum item cadastrado.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  name={`${prefix}_${f.key}_${i}`}
                  defaultValue={row[f.key] ?? ""}
                />
              </Field>
            ))}
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Remover"
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function EventSettings({
  trip,
  canWrite,
}: {
  trip: EventSettingsData;
  canWrite: boolean;
}) {
  const action = updateEventSettings.bind(null, trip.id);
  const [state, formAction] = useActionState<EventSettingsState, FormData>(action, {});
  const [kind, setKind] = useState(trip.kind);
  const [invitesEnabled, setInvitesEnabled] = useState(trip.invitesEnabled);

  return (
    <Card>
      <CardBody>
        <h2 className="mb-1 text-sm font-bold text-slate-900">Evento e convites</h2>
        <p className="mb-4 text-xs text-slate-500">
          Ative o módulo de convites para habilitar empresas com cota, convite
          digital com QR code, mapa de mesas e credenciamento.
        </p>

        <form action={formAction} className="space-y-5">
          <fieldset disabled={!canWrite} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de registro">
                <Select
                  name="kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {Object.entries(TRIP_KINDS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Horário do evento">
                <Input name="eventTime" defaultValue={trip.eventTime} placeholder="20:00" />
              </Field>
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                name="invitesEnabled"
                checked={invitesEnabled}
                disabled={kind !== "EVENTO"}
                onChange={(e) => setInvitesEnabled(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong className="text-slate-800">Usar o sistema de convites</strong>
                <span className="block text-xs text-slate-500">
                  {kind === "EVENTO"
                    ? "Habilita as abas Empresas, Convidados, Mapa de mesas, Credenciamento e Relatórios."
                    : "Disponível apenas para registros do tipo Evento."}
                </span>
              </span>
            </label>

            {invitesEnabled && (
              <div className="space-y-5 border-l-2 border-brand-200 pl-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="tablesEnabled"
                    defaultChecked={trip.tablesEnabled}
                  />
                  Usar mapa de mesas (lugar marcado no convite)
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Local do evento">
                    <Input name="venueName" defaultValue={trip.venueName} />
                  </Field>
                  <Field label="Endereço">
                    <Input name="venueAddress" defaultValue={trip.venueAddress} />
                  </Field>
                  <Field label="Traje">
                    <Input name="dressCode" defaultValue={trip.dressCode} />
                  </Field>
                  <Field label="Data-limite das cotas">
                    <Input
                      name="inviteDeadline"
                      type="date"
                      defaultValue={trip.inviteDeadline}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Título do convite (e-mail)">
                    <Input name="emailTitle" defaultValue={trip.emailTitle} />
                  </Field>
                  <Field label="Responder para (reply-to)">
                    <Input name="replyTo" type="email" defaultValue={trip.replyTo} />
                  </Field>
                </div>

                <Field label="Texto de abertura do convite">
                  <Textarea name="emailText" rows={3} defaultValue={trip.emailText} />
                </Field>
                <Field label="Rodapé do convite">
                  <Input name="emailFooter" defaultValue={trip.emailFooter} />
                </Field>

                <Field label="Modelo da mensagem de WhatsApp (opcional)">
                  <Textarea
                    name="whatsappTemplate"
                    rows={4}
                    defaultValue={trip.whatsappTemplate}
                    placeholder="Use {{nome}}, {{evento}}, {{data}}, {{hora}}, {{local}}, {{endereco}}, {{traje}}, {{mesa}}, {{link}}, {{codigo}}"
                  />
                </Field>
                <p className="-mt-3 text-xs text-slate-400">
                  Em branco, o sistema usa a mensagem padrão. O link do convite é
                  sempre incluído, mesmo que o modelo não o mencione.
                </p>

                <Field label="Mensagem de cancelamento (opcional)">
                  <Textarea
                    name="cancelTemplate"
                    rows={3}
                    defaultValue={trip.cancelTemplate}
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="showAgencyLogo"
                    defaultChecked={trip.showAgencyLogo}
                  />
                  Exibir a marca da operadora nas mensagens
                </label>

                <DynamicList
                  label="Hotéis próximos"
                  prefix="hotel"
                  disabled={!canWrite}
                  initial={trip.hotels}
                  fields={[
                    { key: "nome", label: "Nome" },
                    { key: "distancia", label: "Distância" },
                    { key: "endereco", label: "Endereço" },
                    { key: "telefone", label: "Telefone" },
                  ]}
                />

                <DynamicList
                  label="Comodidades"
                  prefix="facility"
                  disabled={!canWrite}
                  initial={trip.facilities}
                  fields={[
                    { key: "titulo", label: "Título" },
                    { key: "descricao", label: "Descrição" },
                  ]}
                />
              </div>
            )}
          </fieldset>

          {state.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Configurações salvas.
            </p>
          )}

          {canWrite && <SubmitButton>Salvar configurações do evento</SubmitButton>}
        </form>
      </CardBody>
    </Card>
  );
}
