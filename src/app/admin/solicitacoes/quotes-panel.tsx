"use client";

import { useState, useTransition } from "react";
import {
  takeRequest, saveQuote, deleteQuote, publishQuotes, changeStage,
} from "./quote-actions";
import {
  Badge, Button, Card, CardBody, Field, Input, Modal, Select, SubmitButton,
  Textarea,
} from "@/components/ui";
import { RequestTimeline, type StageEvent } from "@/components/request-timeline";
import { CURRENCIES, TRAVEL_REQUEST_STATUS } from "@/lib/constants";
import { formatDateBR } from "@/lib/utils";
import {
  AlertCircle, Plus, Pencil, Trash2, Send, PlayCircle, CheckCircle2, Star,
} from "lucide-react";

export type QuoteRow = {
  id: string;
  title: string;
  description: string;
  currency: string;
  totalAmount: number;
  perPaxAmount: number;
  validUntil: string | null;
  createdBy: string;
};

function money(currency: string, amount: number) {
  const symbol = CURRENCIES[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Campo de dinheiro com vírgula decimal — o formato que o operador digita. */
function moneyValue(n: number) {
  return n ? n.toFixed(2).replace(".", ",") : "";
}

function QuoteFields({ quote }: { quote?: QuoteRow }) {
  return (
    <div className="space-y-4">
      <Field label="Nome da opção">
        <Input
          name="title"
          defaultValue={quote?.title}
          required
          placeholder="Ex.: Latam direto · Copa com escala em PTY"
        />
      </Field>
      <Field label="O que está incluso">
        <Textarea
          name="description"
          rows={3}
          defaultValue={quote?.description}
          placeholder="Trechos, classe, bagagem, hotel, traslado, o que mais o associado precisa saber para comparar."
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Moeda">
          <Select name="currency" defaultValue={quote?.currency ?? "BRL"}>
            {Object.entries(CURRENCIES).map(([v, symbol]) => (
              <option key={v} value={v}>
                {v} ({symbol})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor por passageiro">
          <Input
            name="perPaxAmount"
            inputMode="decimal"
            defaultValue={moneyValue(quote?.perPaxAmount ?? 0)}
            placeholder="8.780,00"
          />
        </Field>
        <Field label="Valor total">
          <Input
            name="totalAmount"
            inputMode="decimal"
            defaultValue={moneyValue(quote?.totalAmount ?? 0)}
            placeholder="17.560,00"
          />
        </Field>
      </div>
      <Field label="Tarifa válida até">
        <Input name="validUntil" type="date" defaultValue={quote?.validUntil ?? ""} />
      </Field>
    </div>
  );
}

export function QuotesPanel({
  requestId,
  status,
  events,
  quotes,
  chosenQuoteId,
  canWrite,
}: {
  requestId: string;
  status: string;
  events: StageEvent[];
  quotes: QuoteRow[];
  chosenQuoteId: string | null;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QuoteRow | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Salva a opção e fecha o modal só quando a action confirma. */
  const submitQuote = (quoteId: string | null) => (formData: FormData) => {
    startTransition(async () => {
      const r = await saveQuote(requestId, quoteId, {}, formData);
      if (r.error) {
        setFormError(r.error);
        return;
      }
      setFormError(null);
      setCreating(false);
      setEditing(null);
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Etapa do atendimento
        </h3>
        <RequestTimeline status={status} events={events} audience="STAFF" />
      </section>

      {canWrite && (
        <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 py-3">
          {status === "NOVO" && (
            <Button
              size="sm"
              onClick={async () => {
                const r = await takeRequest(requestId);
                setNotice(r.error ?? r.info ?? "Atendimento assumido.");
              }}
            >
              <PlayCircle className="h-4 w-4" /> Assumir atendimento
            </Button>
          )}
          {["EM_ATENDIMENTO", "COTADO"].includes(status) && (
            <Button size="sm" onClick={() => setPublishing(true)}>
              <Send className="h-4 w-4" />
              {status === "COTADO" ? "Reenviar opções" : "Publicar opções ao associado"}
            </Button>
          )}
          <Select
            defaultValue={status}
            className="w-44"
            onChange={async (e) => {
              const r = await changeStage(requestId, e.target.value, "");
              setNotice(r.error ?? r.info ?? "Etapa alterada.");
            }}
          >
            {Object.entries(TRAVEL_REQUEST_STATUS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Opções de cotação ({quotes.length})
          </h3>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova opção
            </Button>
          )}
        </div>

        {quotes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            Nenhuma opção cadastrada. Monte as alternativas e publique para o
            associado escolher.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => {
              const chosen = q.id === chosenQuoteId;
              return (
                <Card
                  key={q.id}
                  className={chosen ? "border-brand-400 bg-brand-50/40" : ""}
                >
                  <CardBody className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        {q.title}
                        {chosen && (
                          <Badge tone="green">
                            <Star className="h-3 w-3" /> escolhida
                          </Badge>
                        )}
                      </p>
                      {q.description && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                          {q.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        <span className="font-bold text-brand-700">
                          {money(q.currency, q.perPaxAmount)}
                        </span>
                        <span className="text-xs text-slate-400"> por passageiro · </span>
                        <span className="text-xs text-slate-500">
                          total {money(q.currency, q.totalAmount)}
                        </span>
                      </p>
                      {q.validUntil && (
                        <p className="text-[11px] text-slate-400">
                          Tarifa válida até {formatDateBR(q.validUntil)}
                        </p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(q)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm(`Excluir a opção “${q.title}”?`)) return;
                            await deleteQuote(q.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={creating}
        onClose={() => {
          setCreating(false);
          setFormError(null);
        }}
        title="Nova opção de cotação"
      >
        <form action={submitQuote(null)} className="space-y-4">
          <QuoteFields />
          {formError && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </p>
          )}
          <SubmitButton>Salvar opção</SubmitButton>
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setFormError(null);
        }}
        title={editing ? `Editar “${editing.title}”` : "Editar opção"}
      >
        {editing && (
          <form action={submitQuote(editing.id)} className="space-y-4">
            <QuoteFields quote={editing} />
            {formError && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
              </p>
            )}
            <SubmitButton>Salvar alterações</SubmitButton>
          </form>
        )}
      </Modal>

      <Modal
        open={publishing}
        onClose={() => setPublishing(false)}
        title="Publicar opções ao associado"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            O associado recebe um e-mail e um WhatsApp com o resumo das{" "}
            {quotes.length} opção(ões) e o link para escolher. A solicitação passa
            para a etapa <strong>Cotado</strong>.
          </p>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observação interna sobre esta publicação (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPublishing(false)}>
              Voltar
            </Button>
            <Button
              onClick={async () => {
                const r = await publishQuotes(requestId, note.trim());
                setPublishing(false);
                setNote("");
                setNotice(r.error ?? r.info ?? "Opções publicadas.");
              }}
            >
              <Send className="h-4 w-4" /> Publicar e avisar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!notice} onClose={() => setNotice(null)} title="Resultado">
        <p className="flex items-start gap-2 text-sm text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {notice}
        </p>
      </Modal>
    </div>
  );
}
