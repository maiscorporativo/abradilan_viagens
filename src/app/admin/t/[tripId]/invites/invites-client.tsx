"use client";

import { useState, useMemo, useActionState } from "react";
import {
  createInvite, updateInvite, cancelInvite, dispatchInvite,
  dispatchInvitesBatch, type InviteActionState,
} from "./actions";
import {
  Badge, Button, Field, Input, Modal, Select, SubmitButton, Table, Td, Th,
  Textarea,
} from "@/components/ui";
import { CloseOnSuccess } from "@/components/close-on-success";
import { INVITE_KINDS, INVITE_STATUS } from "@/lib/constants";
import {
  AlertCircle, Mail, MessageCircle, Pencil, Plus, Search, Ban, Copy, Link2,
} from "lucide-react";

export type InviteRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  kind: string;
  status: string;
  code: string;
  token: string;
  companyId: string | null;
  companyName: string;
  tableLabel: string;
  notes: string;
  lastDelivery: string;
};

export type CompanyOpt = { id: string; name: string; remaining: number };

const statusTone: Record<string, string> = {
  PENDENTE: "slate",
  ENVIADO: "blue",
  CONFIRMADO: "green",
  RECUSADO: "rose",
  CREDENCIADO: "violet",
  CANCELADO: "rose",
};

function InviteFields({
  invite,
  companies,
  individualPool,
}: {
  invite?: InviteRow;
  companies?: CompanyOpt[];
  individualPool?: number;
}) {
  return (
    <div className="space-y-4">
      {companies && (
        <Field label="Empresa (deixe em branco para convite individual)">
          <Select name="companyId" defaultValue="">
            <option value="">
              Convite individual — {individualPool ?? 0} disponível(is)
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} disabled={c.remaining <= 0}>
                {c.name} — {c.remaining} livre(s)
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="name" defaultValue={invite?.name} required />
        </Field>
        <Field label="Cargo">
          <Input name="role" defaultValue={invite?.role} />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={invite?.email} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input name="phone" defaultValue={invite?.phone} />
        </Field>
      </div>
      <Field label="Observações internas">
        <Textarea name="notes" rows={2} defaultValue={invite?.notes} />
      </Field>
    </div>
  );
}

export function InvitesClient({
  tripId,
  invites,
  companies,
  individualPool,
  baseUrl,
  canWrite,
}: {
  tripId: string;
  invites: InviteRow[];
  companies: CompanyOpt[];
  individualPool: number;
  baseUrl: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InviteRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ title: string; body: React.ReactNode } | null>(
    null
  );

  const [createState, createAction] = useActionState<InviteActionState, FormData>(
    async (prev, formData) => createInvite(tripId, prev, formData),
    {}
  );
  const [editState, editAction] = useActionState<InviteActionState, FormData>(
    async (prev, formData) => updateInvite(tripId, editing!.id, prev, formData),
    {}
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invites.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false;
      if (companyFilter === "INDIVIDUAL" && i.companyId !== null) return false;
      if (companyFilter && companyFilter !== "INDIVIDUAL" && i.companyId !== companyFilter) {
        return false;
      }
      if (!term) return true;
      return (
        i.name.toLowerCase().includes(term) ||
        i.email.toLowerCase().includes(term) ||
        i.companyName.toLowerCase().includes(term) ||
        i.code.includes(term)
      );
    });
  }, [invites, search, statusFilter, companyFilter]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const showDispatchResult = (
    name: string,
    result: Awaited<ReturnType<typeof dispatchInvite>>
  ) => {
    setNotice({
      title: `Convite de ${name}`,
      body: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>{result.detail}</p>
          {result.link && (
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp com a mensagem
            </a>
          )}
          {result.message && !result.link && (
            <>
              <p className="text-xs text-slate-500">
                Mensagem pronta para envio manual:
              </p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">
                {result.message}
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(result.message!)}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar mensagem
              </Button>
            </>
          )}
        </div>
      ),
    });
  };

  const runBatch = async (channel: "EMAIL" | "WHATSAPP") => {
    const report = await dispatchInvitesBatch(tripId, selected, channel);
    setSelected([]);
    setNotice({
      title: `Disparo em lote — ${report.length} convidado(s)`,
      body: (
        <ul className="max-h-80 space-y-1.5 overflow-auto text-sm">
          {report.map((r) => (
            <li key={r.inviteId} className="flex items-start gap-2">
              <Badge tone={r.result.ok ? "green" : "rose"}>{r.result.status}</Badge>
              <span className="min-w-0">
                <strong>{r.name}</strong>
                <span className="block text-xs text-slate-500">{r.result.detail}</span>
                {r.result.link && (
                  <a
                    href={r.result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Abrir no WhatsApp
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  };

  return (
    <>
      <CloseOnSuccess savedAt={createState.savedAt} onClose={() => setCreating(false)} />
      <CloseOnSuccess savedAt={editState.savedAt} onClose={() => setEditing(null)} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, empresa ou código"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          <option value="">Todos os status</option>
          {Object.entries(INVITE_STATUS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-52"
        >
          <option value="">Todas as empresas</option>
          <option value="INDIVIDUAL">Convites individuais</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo convidado
          </Button>
        )}
      </div>

      {canWrite && selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="font-semibold text-brand-800">
            {selected.length} selecionado(s)
          </span>
          <Button variant="outline" size="sm" onClick={() => runBatch("EMAIL")}>
            <Mail className="h-3.5 w-3.5" /> Enviar por e-mail
          </Button>
          <Button variant="outline" size="sm" onClick={() => runBatch("WHATSAPP")}>
            <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Limpar
          </Button>
        </div>
      )}

      <Table>
        <thead>
          <tr>
            {canWrite && <Th className="w-8"> </Th>}
            <Th>Convidado</Th>
            <Th>Empresa</Th>
            <Th>Tipo</Th>
            <Th>Lugar</Th>
            <Th>Status</Th>
            <Th>Último envio</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <Td colSpan={canWrite ? 8 : 7}>
                <span className="text-slate-400">Nenhum convidado encontrado.</span>
              </Td>
            </tr>
          )}
          {filtered.map((i) => (
            <tr key={i.id} className={i.status === "CANCELADO" ? "opacity-60" : ""}>
              {canWrite && (
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.includes(i.id)}
                    onChange={() => toggle(i.id)}
                    disabled={i.status === "CANCELADO"}
                  />
                </Td>
              )}
              <Td>
                <p className="font-semibold text-slate-800">{i.name}</p>
                <p className="text-xs text-slate-400">
                  {i.role && `${i.role} · `}
                  {[i.email, i.phone].filter(Boolean).join(" · ") || "sem contato"}
                </p>
                {i.code && (
                  <p className="font-mono text-[11px] text-slate-400">#{i.code}</p>
                )}
              </Td>
              <Td>{i.companyName || "—"}</Td>
              <Td>
                <span className="text-xs">{INVITE_KINDS[i.kind] ?? i.kind}</span>
              </Td>
              <Td>{i.tableLabel || "—"}</Td>
              <Td>
                <Badge tone={statusTone[i.status] ?? "slate"}>
                  {INVITE_STATUS[i.status] ?? i.status}
                </Badge>
              </Td>
              <Td>
                <span className="text-xs text-slate-400">{i.lastDelivery || "—"}</span>
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    title="Copiar link do convite"
                    onClick={() =>
                      navigator.clipboard?.writeText(`${baseUrl}/convite/${i.token}`)
                    }
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  {canWrite && i.status !== "CANCELADO" && (
                    <>
                      <Button
                        variant="ghost"
                        title="Enviar por e-mail"
                        onClick={async () => {
                          const r = await dispatchInvite(tripId, i.id, "EMAIL");
                          showDispatchResult(i.name, r);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Enviar por WhatsApp"
                        onClick={async () => {
                          const r = await dispatchInvite(tripId, i.id, "WHATSAPP");
                          showDispatchResult(i.name, r);
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" title="Editar" onClick={() => setEditing(i)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Cancelar convite"
                        onClick={async () => {
                          if (!confirm(`Cancelar o convite de ${i.name}?`)) return;
                          const notify = confirm(
                            "Avisar o convidado sobre o cancelamento por e-mail/WhatsApp?"
                          );
                          const r = await cancelInvite(tripId, i.id, notify);
                          if (!r.ok) {
                            setNotice({
                              title: "Cancelamento",
                              body: <p className="text-sm">{r.error}</p>,
                            });
                          } else if (r.whatsappLink) {
                            setNotice({
                              title: "Aviso de cancelamento",
                              body: (
                                <a
                                  href={r.whatsappLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  <MessageCircle className="h-4 w-4" /> Enviar aviso pelo
                                  WhatsApp
                                </a>
                              ),
                            });
                          }
                        }}
                      >
                        <Ban className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo convidado">
        <form action={createAction} className="space-y-4">
          <InviteFields companies={companies} individualPool={individualPool} />
          {createState.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {createState.error}
            </p>
          )}
          <SubmitButton>Inscrever convidado</SubmitButton>
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? "Editar " + editing.name : "Editar convidado"}
      >
        {editing && (
          <form action={editAction} className="space-y-4">
            <InviteFields invite={editing} />
            {editState.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {editState.error}
              </p>
            )}
            <SubmitButton>Salvar</SubmitButton>
          </form>
        )}
      </Modal>

      <Modal
        open={!!notice}
        onClose={() => setNotice(null)}
        title={notice?.title ?? ""}
      >
        {notice?.body}
      </Modal>
    </>
  );
}
