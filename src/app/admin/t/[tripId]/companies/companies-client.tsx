"use client";

import { useState, useActionState } from "react";
import {
  createCompany, updateCompany, resetCompanyPassword, deleteCompany,
  runInviteExpiration, adjustIndividualPool,
  type CompanyActionState,
} from "./actions";
import {
  Badge, Button, Card, CardBody, Field, Input, Modal, SubmitButton,
  Table, Td, Th,
} from "@/components/ui";
import { CloseOnSuccess } from "@/components/close-on-success";
import {
  AlertCircle, Copy, KeyRound, Pencil, Plus, Trash2, TimerOff,
} from "lucide-react";

export type CompanyRow = {
  id: string;
  companyName: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  login: string;
  provisionalPassword: string;
  quota: number;
  used: number;
};

function CompanyFields({ company }: { company?: CompanyRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Empresa" className="sm:col-span-2">
        <Input name="companyName" defaultValue={company?.companyName} required />
      </Field>
      <Field label="Responsável">
        <Input name="contactName" defaultValue={company?.contactName} />
      </Field>
      <Field label="Cargo">
        <Input name="contactRole" defaultValue={company?.contactRole} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" defaultValue={company?.email} />
      </Field>
      <Field label="Telefone / WhatsApp">
        <Input name="phone" defaultValue={company?.phone} />
      </Field>
      <Field label="Cota de convites">
        <Input
          name="quota"
          type="number"
          min={company?.used ?? 1}
          defaultValue={company?.quota ?? 4}
        />
      </Field>
    </div>
  );
}

function CredentialsBox({
  credentials,
}: {
  credentials: { company: string; login: string; password: string };
}) {
  const text = `Empresa: ${credentials.company}\nLogin: ${credentials.login}\nSenha: ${credentials.password}`;
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
      <p className="font-semibold">Credenciais de acesso — {credentials.company}</p>
      <p className="mt-2 font-mono text-xs">
        Login: <strong>{credentials.login}</strong>
        <br />
        Senha: <strong>{credentials.password}</strong>
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => navigator.clipboard?.writeText(text)}
      >
        <Copy className="h-3.5 w-3.5" /> Copiar
      </Button>
      <p className="mt-2 text-xs">
        A senha também acompanha o convite do responsável, enquanto ele não a
        trocar.
      </p>
    </div>
  );
}

export function CompaniesClient({
  tripId,
  companies,
  individualPool,
  invitesExpired,
  deadline,
  canWrite,
}: {
  tripId: string;
  companies: CompanyRow[];
  individualPool: number;
  invitesExpired: boolean;
  deadline: string | null;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [credentials, setCredentials] = useState<
    { company: string; login: string; password: string } | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createState, createAction] = useActionState<CompanyActionState, FormData>(
    async (prev, formData) => createCompany(tripId, prev, formData),
    {}
  );
  const [editState, editAction] = useActionState<CompanyActionState, FormData>(
    async (prev, formData) => updateCompany(tripId, editing!.id, prev, formData),
    {}
  );

  const totalQuota = companies.reduce((s, c) => s + c.quota, 0);
  const totalUsed = companies.reduce((s, c) => s + c.used, 0);

  return (
    <>
      {/* O modal de criação segue aberto para exibir as credenciais geradas. */}
      <CloseOnSuccess savedAt={editState.savedAt} onClose={() => setEditing(null)} />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Empresas
            </p>
            <p className="text-2xl font-bold text-slate-900">{companies.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Cota total
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalQuota}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Convites usados
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalUsed}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Pool individual
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">{individualPool}</p>
              {canWrite && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustIndividualPool(tripId, 1)}
                    title="Adicionar 1 convite individual"
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustIndividualPool(tripId, -1)}
                    title="Remover 1 convite individual"
                  >
                    −
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {deadline ? (
            <>
              Data-limite das cotas: <strong>{deadline}</strong>
              {invitesExpired && " — expiração já processada."}
            </>
          ) : (
            "Nenhuma data-limite definida nas configurações do evento."
          )}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={invitesExpired}
              onClick={async () => {
                const aviso =
                  "Processar a expiração? As cotas não utilizadas serão recolhidas para o pool de convites individuais e as empresas não poderão inscrever mais ninguém.";
                if (!confirm(aviso)) return;
                const r = await runInviteExpiration(tripId);
                setNotice(
                  r.ok
                    ? `Expiração processada: ${r.reclaimed} convite(s) recolhido(s).`
                    : r.error ?? "Falha ao processar."
                );
              }}
            >
              <TimerOff className="h-4 w-4" /> Processar expiração
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nova empresa
            </Button>
          </div>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Responsável</Th>
            <Th>Acesso</Th>
            <Th>Cota</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody>
          {companies.length === 0 && (
            <tr>
              <Td colSpan={5}>
                <span className="text-slate-400">
                  Nenhuma empresa cadastrada neste evento.
                </span>
              </Td>
            </tr>
          )}
          {companies.map((c) => {
            const remaining = c.quota - c.used;
            return (
              <tr key={c.id}>
                <Td>
                  <p className="font-semibold text-slate-800">{c.companyName}</p>
                  {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                </Td>
                <Td>
                  {c.contactName || "—"}
                  {c.contactRole && (
                    <span className="block text-xs text-slate-400">{c.contactRole}</span>
                  )}
                </Td>
                <Td>
                  <span className="font-mono text-xs">{c.login}</span>
                  {c.provisionalPassword ? (
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      {c.provisionalPassword}
                    </span>
                  ) : (
                    <Badge tone="green" className="ml-2">
                      senha trocada
                    </Badge>
                  )}
                </Td>
                <Td>
                  <span className="font-semibold">{c.used}</span>
                  <span className="text-slate-400">/{c.quota}</span>
                  {remaining > 0 ? (
                    <Badge tone="amber" className="ml-2">
                      {remaining} livre{remaining > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge tone="slate" className="ml-2">
                      esgotada
                    </Badge>
                  )}
                </Td>
                <Td>
                  {canWrite && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => setEditing(c)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Gerar nova senha"
                        onClick={async () => {
                          const r = await resetCompanyPassword(tripId, c.id);
                          if (r.credentials) setCredentials(r.credentials);
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Excluir empresa"
                        onClick={async () => {
                          const aviso = `Excluir ${c.companyName}? Os convites já emitidos continuam válidos, mas passam a constar como individuais.`;
                          if (!confirm(aviso)) return;
                          await deleteCompany(tripId, c.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nova empresa convidada">
        {createState.credentials ? (
          <div className="space-y-4">
            <CredentialsBox credentials={createState.credentials} />
            <Button onClick={() => setCreating(false)}>Concluir</Button>
          </div>
        ) : (
          <form action={createAction} className="space-y-4">
            <CompanyFields />
            {createState.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {createState.error}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Com o responsável preenchido, ele já é inscrito como convidado e
              consome 1 convite da cota.
            </p>
            <SubmitButton>Cadastrar e gerar acesso</SubmitButton>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? "Editar " + editing.companyName : "Editar empresa"}
      >
        {editing && (
          <form action={editAction} className="space-y-4">
            <CompanyFields company={editing} />
            {editing.used > 0 && (
              <p className="text-xs text-slate-500">
                A cota não pode ficar abaixo de {editing.used} (convites já
                utilizados).
              </p>
            )}
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
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Novas credenciais"
      >
        {credentials && <CredentialsBox credentials={credentials} />}
      </Modal>

      <Modal open={!!notice} onClose={() => setNotice(null)} title="Expiração das cotas">
        <p className="text-sm text-slate-700">{notice}</p>
      </Modal>
    </>
  );
}
