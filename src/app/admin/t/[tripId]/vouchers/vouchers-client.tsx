"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  createVoucherTemplate, updateVoucherTemplate, deleteVoucherTemplate,
  sendVouchers, setTemplateVisibility, copyVoucherTemplate,
  type ActionState, type SendReport,
} from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal, Select,
  SubmitButton, Textarea,
} from "@/components/ui";
import { VOUCHER_KINDS, VOUCHER_SECTIONS } from "@/lib/constants";
import {
  AlertCircle, CheckCircle2, Copy, Download, Eye, EyeOff, FileArchive,
  Loader2, Mail, MessageCircle, MousePointerSquareDashed, Pencil, Plus, Send,
  Ticket, Trash2, XCircle,
} from "lucide-react";

export type TemplateRow = {
  id: string;
  name: string;
  kind: string;
  headerText: string;
  footerText: string;
  accentColor: string;
  sections: string; // JSON
  hasPdf: boolean;
  visibleToPassenger: boolean;
  fieldCount: number;
};

type PassengerOpt = {
  id: string;
  name: string;
  hasEmail: boolean;
  hasPhone: boolean;
};

export type TripOpt = { id: string; name: string; clientName: string };

function parseSections(json: string): { key: string; title?: string; content?: string }[] {
  try {
    return JSON.parse(json || "[]");
  } catch {
    return [];
  }
}

export function VouchersClient({
  tripId,
  templates,
  passengers,
  trips,
  canWrite,
  emailReady,
  whatsappReady,
}: {
  tripId: string;
  templates: TemplateRow[];
  passengers: PassengerOpt[];
  trips: TripOpt[];
  canWrite: boolean;
  emailReady: boolean;
  whatsappReady: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [sending, setSending] = useState<TemplateRow | null>(null);
  const [copying, setCopying] = useState<TemplateRow | null>(null);

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo template
          </Button>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title="Nenhum template de voucher"
          description='Crie templates como "Voucher Internacional" ou "Voucher de Hospedagem" — automáticos ou sobre um PDF próprio com campos posicionados.'
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              tripId={tripId}
              template={t}
              passengers={passengers}
              canWrite={canWrite}
              onEdit={() => setEditing(t)}
              onSend={() => setSending(t)}
              onCopy={() => setCopying(t)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TemplateModal
          tripId={tripId}
          template={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {sending && (
        <SendModal
          tripId={tripId}
          template={sending}
          passengers={passengers}
          emailReady={emailReady}
          whatsappReady={whatsappReady}
          onClose={() => setSending(null)}
        />
      )}

      {copying && (
        <CopyModal
          tripId={tripId}
          template={copying}
          trips={trips}
          onClose={() => setCopying(null)}
        />
      )}
    </>
  );
}

/** Copia o template para esta ou outra viagem, mantendo PDF e campos. */
function CopyModal({
  tripId,
  template,
  trips,
  onClose,
}: {
  tripId: string;
  template: TemplateRow;
  trips: TripOpt[];
  onClose: () => void;
}) {
  const [targetTripId, setTargetTripId] = useState(tripId);
  const [name, setName] = useState(`${template.name} (cópia)`);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<TripOpt | null>(null);
  const [isCopying, startCopying] = useTransition();

  const sameTrip = targetTripId === tripId;

  const copy = () => {
    setError(null);
    startCopying(async () => {
      const result = await copyVoucherTemplate(
        tripId,
        template.id,
        targetTripId,
        name
      );
      if (result.error) setError(result.error);
      else setDone(trips.find((t) => t.id === targetTripId) ?? null);
    });
  };

  return (
    <Modal open onClose={onClose} title={`Copiar — ${template.name}`}>
      {done ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Cópia criada{done.id !== tripId && <> em <strong>{done.name}</strong></>}.
              O PDF de fundo e os {template.fieldCount} campo(s) posicionados
              foram preservados. A cópia começa oculta no portal.
            </span>
          </p>
          <div className="flex justify-end gap-2">
            {done.id !== tripId && (
              <Link
                href={`/admin/t/${done.id}/vouchers`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
              >
                Ir para os vouchers da viagem
              </Link>
            )}
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            A cópia leva junto o PDF de fundo, os campos já posicionados no
            editor, as seções, cores e textos. Depois é só ajustar o que mudar
            nesta viagem — sem reposicionar tudo de novo.
          </p>

          <Field label="Viagem de destino">
            <Select
              value={targetTripId}
              onChange={(e) => setTargetTripId(e.target.value)}
            >
              <option value={tripId}>Esta mesma viagem (duplicar)</option>
              {trips
                .filter((t) => t.id !== tripId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.clientName}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Nome da cópia">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${template.name} (cópia)`}
            />
          </Field>

          {!sameTrip && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Confira os textos do template na nova viagem (nome do destino,
              datas e observações costumam mudar).
            </p>
          )}

          {error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={copy} disabled={isCopying}>
              {isCopying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Criar cópia
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TemplateCard({
  tripId,
  template,
  passengers,
  canWrite,
  onEdit,
  onSend,
  onCopy,
}: {
  tripId: string;
  template: TemplateRow;
  passengers: PassengerOpt[];
  canWrite: boolean;
  onEdit: () => void;
  onSend: () => void;
  onCopy: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [togglingVisibility, startToggling] = useTransition();
  const sections = parseSections(template.sections);

  return (
    <Card>
      <div
        className="h-1.5 rounded-t-xl"
        style={{ backgroundColor: template.accentColor }}
      />
      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">{template.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="teal">{VOUCHER_KINDS[template.kind] ?? template.kind}</Badge>
              {template.hasPdf ? (
                <Badge tone="violet">
                  Template PDF · {template.fieldCount} campo(s)
                </Badge>
              ) : (
                <Badge tone="slate">Layout automático</Badge>
              )}
              {template.visibleToPassenger && (
                <Badge tone="teal">Visível no portal</Badge>
              )}
            </div>
          </div>
          {canWrite && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                title="Copiar para esta ou outra viagem"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit} title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <form action={deleteVoucherTemplate.bind(null, tripId, template.id)}>
                <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )}
        </div>

        {!template.hasPdf && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <Badge key={s.key} tone="slate">
                {VOUCHER_SECTIONS[s.key] ?? s.key}
              </Badge>
            ))}
            {sections.length === 0 && (
              <Badge tone="slate">Seções padrão (dados + voos + hospedagem)</Badge>
            )}
          </div>
        )}

        {template.hasPdf && canWrite && (
          <Link
            href={`/admin/t/${tripId}/vouchers/${template.id}/editor`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            <MousePointerSquareDashed className="h-3.5 w-3.5" />
            Abrir editor de layout (arrastar campos)
          </Link>
        )}

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <div className="flex gap-2">
            <Select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1"
            >
              <option value="">Gerar para um passageiro…</option>
              {passengers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <a
              href={
                selected
                  ? `/api/vouchers/${template.id}?passenger=${selected}`
                  : undefined
              }
              aria-disabled={!selected}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                selected
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "pointer-events-none bg-slate-200 text-slate-400"
              }`}
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/vouchers/${template.id}?all=1`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileArchive className="h-3.5 w-3.5" />
              Gerar todos ({passengers.length}) em ZIP
            </a>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={onSend} className="!py-2">
                <Send className="h-3.5 w-3.5" /> Enviar por e-mail / WhatsApp
              </Button>
            )}
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                className="!py-2"
                disabled={togglingVisibility}
                onClick={() =>
                  startToggling(async () => {
                    await setTemplateVisibility(
                      tripId,
                      template.id,
                      !template.visibleToPassenger
                    );
                  })
                }
              >
                {togglingVisibility ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : template.visibleToPassenger ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {template.visibleToPassenger
                  ? "Ocultar do portal"
                  : "Disponibilizar no portal"}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SendModal({
  tripId,
  template,
  passengers,
  emailReady,
  whatsappReady,
  onClose,
}: {
  tripId: string;
  template: TemplateRow;
  passengers: PassengerOpt[];
  emailReady: boolean;
  whatsappReady: boolean;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "whatsapp">(
    emailReady || !whatsappReady ? "email" : "whatsapp"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<SendReport | null>(null);
  const [isSending, startSending] = useTransition();

  const channelReady = channel === "email" ? emailReady : whatsappReady;
  const filtered = useMemo(
    () => passengers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [passengers, query]
  );
  const eligible = (p: PassengerOpt) =>
    channel === "email" ? p.hasEmail : p.hasPhone;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(passengers.filter(eligible).map((p) => p.id)));
  };

  const send = () => {
    startSending(async () => {
      const result = await sendVouchers(tripId, template.id, channel, [...selectedIds]);
      setReport(result);
    });
  };

  return (
    <Modal open onClose={onClose} title={`Enviar — ${template.name}`} wide>
      {report ? (
        <div>
          <h3 className="mb-3 text-sm font-bold text-slate-900">
            Resultado do envio ({report.results.filter((r) => r.ok).length}/
            {report.results.length} enviados)
          </h3>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {report.results.map((r) => (
              <li
                key={r.passengerId}
                className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>
                  <span className="font-semibold">{r.name}</span>
                  {!r.ok && (
                    <span className="block text-xs text-rose-600">{r.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setChannel("email")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                channel === "email"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <Mail className="h-4 w-4" /> E-mail
            </button>
            <button
              onClick={() => setChannel("whatsapp")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                channel === "whatsapp"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>

          {!channelReady && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {channel === "email"
                ? "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no arquivo .env e reinicie o servidor."
                : "Evolution API não configurada. Defina EVOLUTION_URL, EVOLUTION_APIKEY e EVOLUTION_INSTANCE no arquivo .env e reinicie o servidor."}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar passageiros…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar todos
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {filtered.map((p) => {
              const ok = eligible(p);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    ok
                      ? "cursor-pointer text-slate-800 hover:bg-slate-50"
                      : "cursor-not-allowed text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!ok}
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  {p.name}
                  {!ok && (
                    <span className="text-[10px] uppercase">
                      {channel === "email" ? "sem e-mail" : "sem telefone"}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {selectedIds.size} passageiro(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={send}
                disabled={!channelReady || selectedIds.size === 0 || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TemplateModal({
  tripId,
  template,
  onClose,
}: {
  tripId: string;
  template?: TemplateRow;
  onClose: () => void;
}) {
  const action = template
    ? updateVoucherTemplate.bind(null, tripId, template.id)
    : createVoucherTemplate.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const sections = parseSections(template?.sections ?? "[]");
  const has = (key: string) =>
    template ? sections.some((s) => s.key === key) : key !== "itinerary";
  const freeText = sections.find((s) => s.key === "freeText");
  const [freeChecked, setFreeChecked] = useState(!!freeText);

  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open
      onClose={onClose}
      title={template ? `Editar — ${template.name}` : "Novo template de voucher"}
      wide
    >
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do template *">
            <Input
              name="name"
              required
              defaultValue={template?.name}
              placeholder="Ex.: Voucher Internacional"
            />
          </Field>
          <Field label="Tipo">
            <Select name="kind" defaultValue={template?.kind ?? "PERSONALIZADO"}>
              {Object.entries(VOUCHER_KINDS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-lg border-2 border-dashed border-brand-200 bg-brand-50/40 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">
            Template em PDF (opcional)
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Envie um PDF pronto (arte da viagem) e depois use o{" "}
            <strong>editor de layout</strong> para arrastar os campos que serão
            impressos por cima. Sem PDF, o voucher usa o layout automático abaixo.
          </p>
          <Input name="backgroundPdf" type="file" accept="application/pdf" className="py-1.5" />
          {template?.hasPdf && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="removeBackgroundPdf" />
              Remover o PDF atual (volta ao layout automático)
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cor de destaque (layout automático)">
            <Input
              name="accentColor"
              type="color"
              defaultValue={template?.accentColor ?? "#002042"}
              className="h-10 w-24 p-1"
            />
          </Field>
          <Field label="Logo específica (opcional — padrão: logo da viagem)">
            <Input name="logo" type="file" accept="image/png,image/jpeg" className="py-1.5" />
          </Field>
        </div>

        <Field label="Texto de abertura (layout automático)">
          <Textarea
            name="headerText"
            defaultValue={template?.headerText}
            placeholder="Ex.: Apresente este voucher no balcão de atendimento…"
          />
        </Field>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Seções (layout automático)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(VOUCHER_SECTIONS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name={`section_${key}`}
                  defaultChecked={has(key)}
                  onChange={
                    key === "freeText"
                      ? (e) => setFreeChecked(e.target.checked)
                      : undefined
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {freeChecked && (
            <div className="mt-3 space-y-2">
              <Field label="Título do bloco de texto livre">
                <Input
                  name="freeTextTitle"
                  defaultValue={freeText?.title ?? "Informações importantes"}
                />
              </Field>
              <Field label="Conteúdo">
                <Textarea name="freeTextContent" defaultValue={freeText?.content} />
              </Field>
            </div>
          )}
        </div>

        <Field label="Texto de rodapé (layout automático)">
          <Textarea name="footerText" defaultValue={template?.footerText} />
        </Field>

        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>{template ? "Salvar" : "Criar template"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
