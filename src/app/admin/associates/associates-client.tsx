"use client";

import { useState, useActionState } from "react";
import {
  createAssociate, updateAssociate, resetAssociatePassword,
  type AssociateActionState,
} from "./actions";
import {
  Badge, Button, Field, Input, Modal, Select, SubmitButton, Table, Td, Th,
} from "@/components/ui";
import { CloseOnSuccess } from "@/components/close-on-success";
import { ASSOCIATE_ROLES } from "@/lib/constants";
import { AlertCircle, KeyRound, Pencil, Plus, Copy } from "lucide-react";

export type AssociateRow = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  cnpj: string;
  phone: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  requestCount: number;
};

function AssociateFields({ associate }: { associate?: AssociateRow }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do responsável">
          <Input name="name" defaultValue={associate?.name} required />
        </Field>
        <Field label="E-mail (login)">
          <Input name="email" type="email" defaultValue={associate?.email} required />
        </Field>
        <Field label="Empresa associada">
          <Input name="companyName" defaultValue={associate?.companyName} />
        </Field>
        <Field label="CNPJ">
          <Input name="cnpj" defaultValue={associate?.cnpj} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input name="phone" defaultValue={associate?.phone} />
        </Field>
        <Field label="Perfil">
          <Select name="role" defaultValue={associate?.role ?? "ASSOCIADO"}>
            {Object.entries(ASSOCIATE_ROLES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {associate && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={associate.active}
            className="rounded border-slate-300"
          />
          Conta ativa
        </label>
      )}
    </div>
  );
}

/** Senha provisória: mostrada uma única vez, com botão de copiar. */
function ProvisionalPassword({ password }: { password: string }) {
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
      <p className="font-semibold">Senha provisória gerada</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded bg-white px-2 py-1 font-mono text-base tracking-widest">
          {password}
        </code>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigator.clipboard?.writeText(password)}
          title="Copiar"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mt-2 text-xs">
        Envie ao associado. Ele será obrigado a definir uma senha própria no
        primeiro acesso. Esta senha não será exibida novamente.
      </p>
    </div>
  );
}

export function AssociatesClient({ associates }: { associates: AssociateRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AssociateRow | null>(null);
  const [resetResult, setResetResult] = useState<
    { name: string; password: string } | null
  >(null);

  const [createState, createAction] = useActionState<AssociateActionState, FormData>(
    createAssociate,
    {}
  );
  const [editState, editAction] = useActionState<AssociateActionState, FormData>(
    async (prev, formData) => updateAssociate(editing!.id, prev, formData),
    {}
  );

  return (
    <>
      {/* O modal de criação permanece aberto após o sucesso, para exibir a
          senha provisória; só o de edição fecha sozinho. */}
      <CloseOnSuccess savedAt={editState.savedAt} onClose={() => setEditing(null)} />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo associado
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Associado</Th>
            <Th>Empresa</Th>
            <Th>Perfil</Th>
            <Th>Solicitações</Th>
            <Th>Situação</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody>
          {associates.length === 0 && (
            <tr>
              <Td colSpan={6}>
                <span className="text-slate-400">Nenhum associado cadastrado.</span>
              </Td>
            </tr>
          )}
          {associates.map((a) => (
            <tr key={a.id}>
              <Td>
                <p className="font-semibold text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-400">{a.email}</p>
              </Td>
              <Td>{a.companyName || "—"}</Td>
              <Td>{ASSOCIATE_ROLES[a.role] ?? a.role}</Td>
              <Td>{a.requestCount}</Td>
              <Td>
                {!a.active ? (
                  <Badge tone="rose">Inativo</Badge>
                ) : a.mustChangePassword ? (
                  <Badge tone="amber">Aguarda 1º acesso</Badge>
                ) : (
                  <Badge tone="green">Ativo</Badge>
                )}
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" onClick={() => setEditing(a)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    title="Gerar nova senha provisória"
                    onClick={async () => {
                      const aviso =
                        "Gerar nova senha provisória para " +
                        a.name +
                        "? A senha atual deixa de funcionar.";
                      if (!confirm(aviso)) return;
                      const r = await resetAssociatePassword(a.id);
                      if (r.password) {
                        setResetResult({ name: a.name, password: r.password });
                      }
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo associado">
        {createState.password ? (
          <div className="space-y-4">
            <ProvisionalPassword password={createState.password} />
            <Button onClick={() => setCreating(false)}>Concluir</Button>
          </div>
        ) : (
          <form action={createAction} className="space-y-4">
            <AssociateFields />
            {createState.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {createState.error}
              </p>
            )}
            <SubmitButton>Cadastrar e gerar senha</SubmitButton>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? "Editar " + editing.name : "Editar"}
      >
        {editing && (
          <form action={editAction} className="space-y-4">
            <AssociateFields associate={editing} />
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
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title={resetResult ? "Nova senha — " + resetResult.name : "Nova senha"}
      >
        {resetResult && <ProvisionalPassword password={resetResult.password} />}
      </Modal>
    </>
  );
}
