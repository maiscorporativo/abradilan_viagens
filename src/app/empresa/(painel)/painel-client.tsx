"use client";

import { useState, useActionState } from "react";
import {
  saveCompanyProfile, addCompanyGuest, resendCompanyInvite,
  cancelCompanyGuest, changeCompanyPassword, type CompanyPanelState,
} from "./actions";
import {
  Badge, Button, Card, CardBody, Field, Input, Modal, SubmitButton,
} from "@/components/ui";
import { INVITE_STATUS } from "@/lib/constants";
import {
  AlertCircle, CheckCircle2, Mail, MessageCircle, Ban, Link2, UserPlus, KeyRound,
} from "lucide-react";

export type GuestRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  kind: string;
  status: string;
  seat: string;
  token: string;
};

const statusTone: Record<string, string> = {
  PENDENTE: "slate",
  ENVIADO: "blue",
  CONFIRMADO: "green",
  RECUSADO: "rose",
  CREDENCIADO: "violet",
  CANCELADO: "rose",
};

export function PainelClient({
  company,
  guests,
  deadlineLabel,
  deadlinePassed,
  baseUrl,
}: {
  company: {
    companyName: string;
    contactName: string;
    contactRole: string;
    email: string;
    phone: string;
    quota: number;
    used: number;
  };
  guests: GuestRow[];
  deadlineLabel: string | null;
  deadlinePassed: boolean;
  baseUrl: string;
}) {
  const [notice, setNotice] = useState<{ title: string; body: React.ReactNode } | null>(
    null
  );
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileState, profileAction] = useActionState<CompanyPanelState, FormData>(
    saveCompanyProfile,
    {}
  );
  const [guestState, guestAction] = useActionState<CompanyPanelState, FormData>(
    addCompanyGuest,
    {}
  );
  const [passwordState, passwordAction] = useActionState<CompanyPanelState, FormData>(
    changeCompanyPassword,
    {}
  );

  const remaining = Math.max(0, company.quota - company.used);

  const showResult = (
    name: string,
    result: Awaited<ReturnType<typeof resendCompanyInvite>>
  ) =>
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
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp com a mensagem
            </a>
          )}
        </div>
      ),
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Cota
            </p>
            <p className="text-2xl font-bold text-slate-900">{company.quota}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Inscritos
            </p>
            <p className="text-2xl font-bold text-slate-900">{company.used}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Disponíveis
            </p>
            <p className="text-2xl font-bold text-brand-700">{remaining}</p>
          </CardBody>
        </Card>
      </div>

      {deadlineLabel && (
        <p
          className={
            "rounded-lg px-3 py-2 text-sm " +
            (deadlinePassed
              ? "bg-rose-50 text-rose-700"
              : "bg-amber-50 text-amber-800")
          }
        >
          {deadlinePassed
            ? `O prazo de inscrição encerrou em ${deadlineLabel}. Para alterações, fale com a organização.`
            : `Você tem até ${deadlineLabel} para usar sua cota. Depois disso, os convites não utilizados voltam para a organização.`}
        </p>
      )}

      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Dados do responsável
          </h2>
          <form action={profileAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <Input name="contactName" defaultValue={company.contactName} required />
              </Field>
              <Field label="Cargo">
                <Input name="contactRole" defaultValue={company.contactRole} required />
              </Field>
              <Field label="E-mail">
                <Input name="email" type="email" defaultValue={company.email} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <Input name="phone" defaultValue={company.phone} />
              </Field>
            </div>
            {profileState.error && (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {profileState.error}
              </p>
            )}
            {profileState.ok && (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Dados salvos.
              </p>
            )}
            <div className="flex items-center gap-2">
              <SubmitButton>Salvar meus dados</SubmitButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setChangingPassword(true)}
              >
                <KeyRound className="h-3.5 w-3.5" /> Trocar senha
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {!deadlinePassed && remaining > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserPlus className="h-4 w-4" /> Inscrever convidado
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              O convite digital é enviado automaticamente por e-mail e WhatsApp
              assim que você inscrever.
            </p>
            <form action={guestAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <Input name="name" required />
                </Field>
                <Field label="Cargo">
                  <Input name="role" />
                </Field>
                <Field label="E-mail">
                  <Input name="email" type="email" />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <Input name="phone" />
                </Field>
              </div>
              {guestState.error && (
                <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {guestState.error}
                </p>
              )}
              {guestState.ok && (
                <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> {guestState.info}
                  </p>
                  {guestState.whatsappLink && (
                    <a
                      href={guestState.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Enviar pelo WhatsApp
                    </a>
                  )}
                </div>
              )}
              <SubmitButton>Inscrever e enviar convite</SubmitButton>
            </form>
          </CardBody>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          Seus convidados ({guests.length})
        </h2>
        <div className="space-y-2">
          {guests.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm text-slate-400">
              Nenhum convidado inscrito ainda.
            </p>
          )}
          {guests.map((g) => (
            <Card key={g.id} className={g.status === "CANCELADO" ? "opacity-60" : ""}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {g.name}
                    {g.kind === "RESPONSAVEL" && (
                      <Badge tone="teal" className="ml-2">
                        responsável
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {g.role && `${g.role} · `}
                    {g.email || g.phone || "sem contato"}
                    {g.seat && ` · ${g.seat}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={statusTone[g.status] ?? "slate"}>
                    {INVITE_STATUS[g.status] ?? g.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Copiar link do convite"
                    onClick={() =>
                      navigator.clipboard?.writeText(`${baseUrl}/convite/${g.token}`)
                    }
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  {g.status !== "CANCELADO" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Reenviar por e-mail"
                        onClick={async () =>
                          showResult(g.name, await resendCompanyInvite(g.id, "EMAIL"))
                        }
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Reenviar por WhatsApp"
                        onClick={async () =>
                          showResult(g.name, await resendCompanyInvite(g.id, "WHATSAPP"))
                        }
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      {g.kind !== "RESPONSAVEL" && !deadlinePassed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Cancelar convite"
                          onClick={async () => {
                            if (!confirm(`Cancelar o convite de ${g.name}?`)) return;
                            const notify = confirm("Avisar o convidado do cancelamento?");
                            const r = await cancelCompanyGuest(g.id, notify);
                            if (r.error) {
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
                                    <MessageCircle className="h-4 w-4" /> Enviar aviso
                                  </a>
                                ),
                              });
                            }
                          }}
                        >
                          <Ban className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        title="Trocar senha"
      >
        <form action={passwordAction} className="space-y-4">
          <Field label="Senha atual">
            <Input name="current" type="password" required />
          </Field>
          <Field label="Nova senha (mínimo 6 caracteres)">
            <Input name="next" type="password" required minLength={6} />
          </Field>
          {passwordState.error && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {passwordState.error}
            </p>
          )}
          {passwordState.ok && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {passwordState.info}
            </p>
          )}
          <SubmitButton>Salvar senha</SubmitButton>
        </form>
      </Modal>

      <Modal open={!!notice} onClose={() => setNotice(null)} title={notice?.title ?? ""}>
        {notice?.body}
      </Modal>
    </div>
  );
}
