"use client";

import { useActionState, useState } from "react";
import {
  updateTrip, deleteTrip, regenerateFormToken, createGroup, deleteGroup,
  type ActionState,
} from "@/app/admin/trips/actions";
import {
  Badge, Button, Card, CardBody, Field, Input, Select, SubmitButton, Textarea,
} from "@/components/ui";
import { TRIP_STATUS } from "@/lib/constants";
import { AlertCircle, CheckCircle2, Copy, Link2, RefreshCw, Trash2 } from "lucide-react";

type TripData = {
  id: string;
  name: string;
  clientName: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  status: string;
  primaryColor: string;
  formToken: string;
  formOpen: boolean;
  formWelcome: string;
  allowCompanion: boolean;
  logoPath: string;
  bannerPath: string;
};

type Group = { id: string; name: string; color: string };

export function SettingsClient({
  trip,
  groups,
  canWrite,
  isMaster,
}: {
  trip: TripData;
  groups: Group[];
  canWrite: boolean;
  isMaster: boolean;
}) {
  const action = updateTrip.bind(null, trip.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  const formUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/f/${trip.formToken}`
      : `/f/${trip.formToken}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-bold text-slate-900">Dados da viagem</h2>
            <form action={formAction} className="space-y-4">
              <fieldset disabled={!canWrite} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome da viagem *">
                    <Input name="name" required defaultValue={trip.name} />
                  </Field>
                  <Field label="Cliente (empresa) *">
                    <Input name="clientName" required defaultValue={trip.clientName} />
                  </Field>
                  <Field label="Destino">
                    <Input name="destination" defaultValue={trip.destination} />
                  </Field>
                  <Field label="Status">
                    <Select name="status" defaultValue={trip.status}>
                      {Object.entries(TRIP_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Início">
                    <Input name="startDate" type="date" defaultValue={trip.startDate} />
                  </Field>
                  <Field label="Fim">
                    <Input name="endDate" type="date" defaultValue={trip.endDate} />
                  </Field>
                  <Field label="Cor principal">
                    <Input
                      name="primaryColor"
                      type="color"
                      defaultValue={trip.primaryColor}
                      className="h-10 w-24 p-1"
                    />
                  </Field>
                  <Field label="Logomarca do cliente (PNG/JPG)">
                    <Input name="logo" type="file" accept="image/*" className="py-1.5" />
                  </Field>
                </div>
                <Field label="Descrição">
                  <Textarea name="description" defaultValue={trip.description} />
                </Field>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Banner da home do portal
                  </h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Arte exibida no topo da página inicial do passageiro.
                    Tamanho recomendado: <strong>1800 × 600 px</strong> (proporção
                    3:1), PNG ou JPG de até 15 MB.
                  </p>
                  {trip.bannerPath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/trip-banner/${trip.id}`}
                      alt="Banner atual"
                      className="mb-3 w-full max-w-md rounded-lg border border-slate-200"
                    />
                  )}
                  <Input name="banner" type="file" accept="image/*" className="py-1.5" />
                  {trip.bannerPath && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" name="removeBanner" />
                      Remover o banner atual
                    </label>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Formulário do convidado
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="formOpen" defaultChecked={trip.formOpen} />
                      Formulário aberto para preenchimento
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="allowCompanion"
                        defaultChecked={trip.allowCompanion}
                      />
                      Permitir cadastro de acompanhante
                    </label>
                    <Field label="Mensagem de boas-vindas do formulário">
                      <Textarea
                        name="formWelcome"
                        defaultValue={trip.formWelcome}
                        placeholder="Ex.: Seja bem-vindo! Preencha seus dados para garantir sua vaga na viagem."
                      />
                    </Field>
                  </div>
                </div>

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

                {canWrite && (
                  <div className="flex justify-end">
                    <SubmitButton>Salvar configurações</SubmitButton>
                  </div>
                )}
              </fieldset>
            </form>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardBody>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Link2 className="h-4 w-4 text-brand-700" /> Link do formulário
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Envie este link aos convidados para que preencham os próprios dados e
              anexem documentos.
            </p>
            <div className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
              {formUrl}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar"}
              </Button>
              {canWrite && (
                <form action={regenerateFormToken.bind(null, trip.id)}>
                  <Button variant="ghost" size="sm" type="submit" title="Gera um novo link e invalida o anterior">
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                  </Button>
                </form>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-2 text-sm font-bold text-slate-900">Grupos da viagem</h2>
            <p className="mb-3 text-xs text-slate-500">
              Segmentações para organizar passageiros (equivalente às “cores”):
              excursões, staff, ônibus, etc.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {groups.length === 0 && (
                <span className="text-xs text-slate-400">Nenhum grupo criado.</span>
              )}
              {groups.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-2 pr-1 text-xs font-semibold text-slate-700"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                  {canWrite && (
                    <form action={deleteGroup.bind(null, trip.id, g.id)}>
                      <button
                        className="rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </form>
                  )}
                </span>
              ))}
            </div>
            {canWrite && (
              <form action={createGroup.bind(null, trip.id)} className="flex gap-2">
                <Input name="name" placeholder="Nome do grupo" required className="flex-1" />
                <Input name="color" type="color" defaultValue="#0ea5e9" className="h-9 w-12 p-1" />
                <Button size="sm" type="submit">Adicionar</Button>
              </form>
            )}
          </CardBody>
        </Card>

        {isMaster && (
          <Card className="border-rose-200">
            <CardBody>
              <h2 className="mb-2 text-sm font-bold text-rose-700">Zona de perigo</h2>
              <p className="mb-3 text-xs text-slate-500">
                Excluir a viagem apaga passageiros, voos, documentos e todo o
                histórico. Esta ação não pode ser desfeita. Digite{" "}
                <strong>{trip.name}</strong> para confirmar.
              </p>
              <Input
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="Nome exato da viagem"
                className="mb-2"
              />
              <form action={deleteTrip.bind(null, trip.id)}>
                <Button
                  variant="danger"
                  size="sm"
                  type="submit"
                  disabled={confirmDelete !== trip.name}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir viagem
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        <Badge tone="slate" className="!text-[10px]">ID da viagem: {trip.id}</Badge>
      </div>
    </div>
  );
}
