"use client";

import { useState, useActionState, useEffect } from "react";
import { createUser, updateUser, type ActionState } from "./actions";
import {
  Badge, Button, Field, Input, Modal, Select, SubmitButton, Table, Td, Th,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import { AlertCircle, Pencil, Plus } from "lucide-react";

export type TripOpt = { id: string; name: string; clientName: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  allTrips: boolean;
  tripIds: string[];
};

function TripAccessFields({
  trips,
  user,
  role,
}: {
  trips: TripOpt[];
  user?: UserRow;
  role: string;
}) {
  const [allTrips, setAllTrips] = useState(user?.allTrips ?? true);

  if (role === "MASTER") {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Usuários Master têm acesso a todas as viagens automaticamente.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          name="allTrips"
          checked={allTrips}
          onChange={(e) => setAllTrips(e.target.checked)}
        />
        Acesso a todas as viagens (inclusive futuras)
      </label>

      {!allTrips && (
        <div className="mt-3 max-h-44 space-y-1 overflow-y-auto border-t border-slate-100 pt-3">
          {trips.length === 0 && (
            <p className="text-xs text-slate-400">Nenhuma viagem cadastrada ainda.</p>
          )}
          {trips.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name={`trip_${t.id}`}
                defaultChecked={user?.tripIds.includes(t.id)}
              />
              <span>
                {t.name}
                <span className="ml-1 text-[11px] text-slate-400">
                  ({t.clientName})
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function UserFields({
  user,
  trips,
}: {
  user?: UserRow;
  trips: TripOpt[];
}) {
  const [role, setRole] = useState(user?.role ?? "AGENTE");
  return (
    <>
      <Field label="Nome *">
        <Input name="name" required defaultValue={user?.name} />
      </Field>
      <Field label="Papel *">
        <Select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="MASTER">Master — controle total</option>
          <option value="AGENTE">Agente — opera as viagens</option>
          <option value="VISUALIZADOR">Visualizador — somente leitura</option>
        </Select>
      </Field>
      <Field label="Viagens que este usuário pode acessar">
        <TripAccessFields trips={trips} user={user} role={role} />
      </Field>
    </>
  );
}

export function UsersClient({
  users,
  trips,
}: {
  users: UserRow[];
  trips: TripOpt[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const accessLabel = (u: UserRow) => {
    if (u.role === "MASTER" || u.allTrips) return "Todas as viagens";
    if (u.tripIds.length === 0) return "Nenhuma viagem";
    return `${u.tripIds.length} viagem(ns)`;
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Papel</Th>
            <Th>Acesso</Th>
            <Th>Status</Th>
            <Th className="w-16"></Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <Td className="font-medium text-slate-900">{u.name}</Td>
              <Td>{u.email}</Td>
              <Td>
                <Badge tone={u.role === "MASTER" ? "violet" : u.role === "AGENTE" ? "teal" : "slate"}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </Badge>
              </Td>
              <Td>
                <Badge tone={u.role === "MASTER" || u.allTrips ? "blue" : u.tripIds.length === 0 ? "rose" : "slate"}>
                  {accessLabel(u)}
                </Badge>
              </Td>
              <Td>
                <Badge tone={u.active ? "green" : "rose"}>
                  {u.active ? "Ativo" : "Inativo"}
                </Badge>
              </Td>
              <Td>
                <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <CreateModal open={creating} trips={trips} onClose={() => setCreating(false)} />
      {editing && (
        <EditModal user={editing} trips={trips} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function CreateModal({
  open,
  trips,
  onClose,
}: {
  open: boolean;
  trips: TripOpt[];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUser, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Novo usuário">
      <form action={formAction} className="space-y-4">
        <UserFields trips={trips} />
        <Field label="E-mail *">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Senha * (mín. 6 caracteres)">
          <Input name="password" type="password" required minLength={6} />
        </Field>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>Criar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({
  user,
  trips,
  onClose,
}: {
  user: UserRow;
  trips: TripOpt[];
  onClose: () => void;
}) {
  const action = updateUser.bind(null, user.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={`Editar — ${user.email}`}>
      <form action={formAction} className="space-y-4">
        <UserFields user={user} trips={trips} />
        <Field label="Nova senha (deixe em branco para manter)">
          <Input name="password" type="password" minLength={6} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          Usuário ativo
        </label>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>Salvar</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
