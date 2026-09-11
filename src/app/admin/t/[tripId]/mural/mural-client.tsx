"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createMuralPost, updateMuralPost, deleteMuralPost, toggleMuralPost,
  type ActionState,
} from "./actions";
import {
  Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal, Select,
  SubmitButton, Textarea,
} from "@/components/ui";
import {
  AlertCircle, Eye, EyeOff, Megaphone, Pencil, Plus, Siren, Trash2,
} from "lucide-react";

export type PostRow = {
  id: string;
  title: string;
  message: string;
  targetType: string;
  targetValue: string;
  targetLabel: string;
  urgent: boolean;
  active: boolean;
  author: string;
  createdAt: string;
};

type Opt = { id: string; name: string };

export function MuralClient({
  tripId,
  posts,
  groups,
  passengers,
  canWrite,
}: {
  tripId: string;
  posts: PostRow[];
  groups: Opt[];
  passengers: Opt[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PostRow | null>(null);

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo recado
          </Button>
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10" />}
          title="Nenhum recado publicado"
          description="Publique comunicados que os passageiros verão no portal."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className={!p.active ? "opacity-60" : ""}>
              <CardBody className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.urgent && (
                        <Badge tone="rose">
                          <Siren className="h-3 w-3" /> Urgente
                        </Badge>
                      )}
                      <h2 className="text-sm font-bold text-slate-900">{p.title}</h2>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {p.message}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {p.createdAt} · por {p.author || "—"} · destinatário:{" "}
                      <span className="font-semibold">{p.targetLabel}</span>
                      {!p.active && " · (inativo)"}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggleMuralPost.bind(null, tripId, p.id)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="submit"
                          title={p.active ? "Ocultar do portal" : "Publicar no portal"}
                        >
                          {p.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                      </form>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <form action={deleteMuralPost.bind(null, tripId, p.id)}>
                        <Button variant="ghost" size="sm" className="text-rose-600" type="submit">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PostModal
          tripId={tripId}
          post={editing ?? undefined}
          groups={groups}
          passengers={passengers}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function PostModal({
  tripId,
  post,
  groups,
  passengers,
  onClose,
}: {
  tripId: string;
  post?: PostRow;
  groups: Opt[];
  passengers: Opt[];
  onClose: () => void;
}) {
  const action = post
    ? updateMuralPost.bind(null, tripId, post.id)
    : createMuralPost.bind(null, tripId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [targetType, setTargetType] = useState(post?.targetType ?? "TODOS");

  useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open onClose={onClose} title={post ? "Editar recado" : "Novo recado"} wide>
      <form action={formAction} className="space-y-4">
        <Field label="Título *">
          <Input name="title" required defaultValue={post?.title} />
        </Field>
        <Field label="Mensagem *">
          <Textarea name="message" required defaultValue={post?.message} className="min-h-28" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destinatário">
            <Select
              name="targetType"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <option value="TODOS">Todos os passageiros</option>
              <option value="GRUPO">Um grupo</option>
              <option value="INDIVIDUAL">Um passageiro</option>
            </Select>
          </Field>
          {targetType === "GRUPO" && (
            <Field label="Grupo">
              <Select name="targetValue" defaultValue={post?.targetValue ?? ""} required>
                <option value="">Selecione…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </Field>
          )}
          {targetType === "INDIVIDUAL" && (
            <Field label="Passageiro">
              <Select name="targetValue" defaultValue={post?.targetValue ?? ""} required>
                <option value="">Selecione…</option>
                {passengers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="urgent" defaultChecked={post?.urgent} />
            Marcar como urgente
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="active" defaultChecked={post?.active ?? true} />
            Publicado (visível no portal)
          </label>
        </div>
        {state.error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <SubmitButton>{post ? "Salvar" : "Publicar"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
