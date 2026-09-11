"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitTravelRequest, type TravelRequestState } from "./actions";
import {
  Button, Card, CardBody, Field, Input, Select, Textarea, SubmitButton,
} from "@/components/ui";
import {
  TIME_PREFERENCES, CABIN_CLASSES, SEAT_PREFERENCES, HOTEL_CATEGORIES,
  ROOM_TYPES, CAR_CATEGORIES, TRAVEL_PASSENGER_TYPES, TRAVEL_DOC_TYPES,
} from "@/lib/constants";
import {
  AlertCircle, CheckCircle2, MessageCircle, Plus, Trash2, Plane, BedDouble,
  Car, LifeBuoy, Users, Route, Mail,
} from "lucide-react";

/** Valores iniciais no modo de edição (a mesma tela serve para criar). */
export type FormInitial = {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  companyName: string;
  flexibleDates: boolean;
  budget: string;
  purpose: string;
  notes: string;
  sendCopy: boolean;
  segments: {
    origin: string;
    destination: string;
    date: string;
    timePreference: string;
    notes: string;
  }[];
  passengers: {
    name: string;
    type: string;
    birthDate: string;
    docType: string;
    docNumber: string;
    docExpiry: string;
    nationality: string;
    email: string;
    phone: string;
    loyalty: string;
    notes: string;
  }[];
  needsFlight: boolean;
  cabinClass: string;
  preferredAirline: string;
  checkedBaggage: boolean;
  seatPreference: string;
  loyaltyProgram: string;
  needsHotel: boolean;
  hotelCity: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  hotelCategory: string;
  hotelRooms: number;
  hotelRoomType: string;
  hotelChain: string;
  hotelBreakfast: boolean;
  hotelReference: string;
  needsTransfer: boolean;
  needsCarRental: boolean;
  carCategory: string;
  carPickup: string;
  carDropoff: string;
  carExtraDriver: boolean;
  needsChauffeur: boolean;
  transferNotes: string;
  needsInsurance: boolean;
  needsCurrency: boolean;
  currencyNotes: string;
  needsVisa: boolean;
  visaNotes: string;
  needsConnectivity: boolean;
  needsEventTicket: boolean;
  eventName: string;
};

/** Linhas dinâmicas recebem um id local só para a chave do React. */
let rowSeq = 0;
const newRow = () => ({ key: `r${rowSeq++}` });

type Row = { key: string };

function options(map: Record<string, string>) {
  return Object.entries(map).map(([v, label]) => (
    <option key={v} value={v}>
      {label}
    </option>
  ));
}

/** Cabeçalho de bloco de serviço, com a caixa que abre e fecha o conteúdo. */
function ServiceBlock({
  name,
  icon: Icon,
  title,
  description,
  defaultChecked = false,
  children,
}: {
  name: string;
  icon: React.ElementType;
  title: string;
  description: string;
  defaultChecked?: boolean;
  children?: React.ReactNode;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <Card>
      <CardBody className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name={name}
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="mt-1"
          />
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.75} />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">{title}</span>
            <span className="block text-xs text-slate-500">{description}</span>
          </span>
        </label>

        {on && children && (
          <div className="space-y-4 border-l-2 border-brand-200 pl-4">{children}</div>
        )}
      </CardBody>
    </Card>
  );
}

export function LinhaDiretaForm({
  defaults,
  attendantName,
  initial,
  action,
  submitLabel = "Enviar para o atendente dedicado",
  cancelHref,
}: {
  defaults: { name: string; email: string; companyName: string; phone: string };
  attendantName: string;
  /** Valores da solicitação existente — ativa o modo de edição. */
  initial?: FormInitial;
  /** Action alternativa; sem ela, cria uma nova solicitação. */
  action?: (
    prev: TravelRequestState,
    formData: FormData
  ) => Promise<TravelRequestState>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<TravelRequestState, FormData>(
    action ?? submitTravelRequest,
    {}
  );

  const v = initial;

  // Sem valores iniciais começa com ida e volta e um passageiro — o caso comum.
  const [segments, setSegments] = useState<Row[]>(() =>
    v && v.segments.length > 0 ? v.segments.map(() => newRow()) : [newRow(), newRow()]
  );
  const [passengers, setPassengers] = useState<Row[]>(() =>
    v && v.passengers.length > 0 ? v.passengers.map(() => newRow()) : [newRow()]
  );

  if (state.success) {
    return (
      <Card className="max-w-3xl">
        <CardBody className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
          </p>
          {state.fallbackLink && (
            <a
              href={state.fallbackLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar briefing para {attendantName}
            </a>
          )}
          {state.copyLink && (
            <a
              href={state.copyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4" /> Receber a minha cópia no WhatsApp
            </a>
          )}
          {state.requestId ? (
            <Link
              href={`/app/solicitacoes/${state.requestId}`}
              className="block text-sm font-semibold text-brand-700 hover:underline"
            >
              Ver e acompanhar a solicitação →
            </Link>
          ) : (
            <p className="text-xs text-slate-500">
              Você pode acompanhar o andamento pela sua área do associado.
            </p>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-4">
      {/* ----------------------------------------------------- solicitante */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Quem está solicitando</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input name="requesterName" defaultValue={v?.requesterName ?? defaults.name} required />
            </Field>
            <Field label="Empresa">
              <Input name="companyName" defaultValue={v?.companyName ?? defaults.companyName} />
            </Field>
            <Field label="E-mail">
              <Input name="requesterEmail" type="email" defaultValue={v?.requesterEmail ?? defaults.email} />
            </Field>
            <Field label="WhatsApp para retorno">
              <Input
                name="requesterPhone"
                defaultValue={v?.requesterPhone ?? defaults.phone}
                placeholder="(11) 99999-9999"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ itinerário */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Route className="h-4 w-4 text-brand-600" /> Itinerário
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSegments((s) => [...s, newRow()])}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar trecho
            </Button>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Um trecho para somente ida, dois para ida e volta, ou quantos precisar
            para um roteiro com várias cidades.
          </p>

          {segments.map((row, i) => (
            <div
              key={row.key}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Trecho {i + 1}
                </span>
                {segments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Remover trecho"
                    onClick={() =>
                      setSegments((s) => s.filter((r) => r.key !== row.key))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Origem">
                  <Input
                    name={`seg_origin_${i}`}
                    defaultValue={v?.segments[i]?.origin ?? ""}
                    placeholder="São Paulo (GRU)"
                  />
                </Field>
                <Field label="Destino">
                  <Input
                    name={`seg_destination_${i}`}
                    defaultValue={v?.segments[i]?.destination ?? ""}
                    placeholder="Chicago (ORD)"
                  />
                </Field>
                <Field label="Data">
                  <Input
                    name={`seg_date_${i}`}
                    type="date"
                    defaultValue={v?.segments[i]?.date ?? ""}
                  />
                </Field>
                <Field label="Horário preferido">
                  <Select
                    name={`seg_timePreference_${i}`}
                    defaultValue={v?.segments[i]?.timePreference ?? "QUALQUER"}
                  >
                    {options(TIME_PREFERENCES)}
                  </Select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Observações do trecho">
                  <Input
                    name={`seg_notes_${i}`}
                    defaultValue={v?.segments[i]?.notes ?? ""}
                    placeholder="Ex.: preciso chegar antes das 14h para a reunião"
                  />
                </Field>
              </div>
            </div>
          ))}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="flexibleDates"
              defaultChecked={v?.flexibleDates ?? false}
              className="rounded border-slate-300"
            />
            Tenho flexibilidade nas datas
          </label>
        </CardBody>
      </Card>

      {/* ----------------------------------------------------- passageiros */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="h-4 w-4 text-brand-600" /> Passageiros
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPassengers((p) => [...p, newRow()])}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar passageiro
            </Button>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Use o nome exatamente como está no documento de viagem — é ele que vai
            no bilhete. Documento e validade agilizam a emissão, mas podem ficar
            para depois.
          </p>

          {passengers.map((row, i) => (
            <div
              key={row.key}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Passageiro {i + 1}
                </span>
                {passengers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Remover passageiro"
                    onClick={() =>
                      setPassengers((p) => p.filter((r) => r.key !== row.key))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo (como no documento)">
                  <Input
                    name={`pax_name_${i}`}
                    defaultValue={v?.passengers[i]?.name ?? (i === 0 ? defaults.name : "")}
                    required={i === 0}
                  />
                </Field>
                <Field label="Tipo">
                  <Select
                    name={`pax_type_${i}`}
                    defaultValue={
                      v?.passengers[i]?.type ?? (i === 0 ? "TITULAR" : "ACOMPANHANTE")
                    }
                  >
                    {options(TRAVEL_PASSENGER_TYPES)}
                  </Select>
                </Field>
                <Field label="Data de nascimento">
                  <Input
                    name={`pax_birthDate_${i}`}
                    type="date"
                    defaultValue={v?.passengers[i]?.birthDate ?? ""}
                  />
                </Field>
                <Field label="Nacionalidade">
                  <Input
                    name={`pax_nationality_${i}`}
                    defaultValue={v?.passengers[i]?.nationality ?? ""}
                    placeholder="Brasileira"
                  />
                </Field>
                <Field label="Documento">
                  <Select
                    name={`pax_docType_${i}`}
                    defaultValue={v?.passengers[i]?.docType ?? "PASSAPORTE"}
                  >
                    {options(TRAVEL_DOC_TYPES)}
                  </Select>
                </Field>
                <Field label="Número do documento">
                  <Input
                    name={`pax_docNumber_${i}`}
                    defaultValue={v?.passengers[i]?.docNumber ?? ""}
                  />
                </Field>
                <Field label="Validade do documento">
                  <Input
                    name={`pax_docExpiry_${i}`}
                    type="date"
                    defaultValue={v?.passengers[i]?.docExpiry ?? ""}
                  />
                </Field>
                <Field label="Programa de fidelidade">
                  <Input
                    name={`pax_loyalty_${i}`}
                    defaultValue={v?.passengers[i]?.loyalty ?? ""}
                    placeholder="Ex.: Latam Pass 123456789"
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    name={`pax_email_${i}`}
                    type="email"
                    defaultValue={v?.passengers[i]?.email ?? (i === 0 ? defaults.email : "")}
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    name={`pax_phone_${i}`}
                    defaultValue={v?.passengers[i]?.phone ?? (i === 0 ? defaults.phone : "")}
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Restrições e observações">
                  <Input
                    name={`pax_notes_${i}`}
                    defaultValue={v?.passengers[i]?.notes ?? ""}
                    placeholder="Alimentação, mobilidade, visto vigente…"
                  />
                </Field>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* -------------------------------------------------------- serviços */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Serviços solicitados</h2>

        <ServiceBlock
          name="needsFlight"
          icon={Plane}
          title="Passagem aérea"
          description="Cotação e emissão dos trechos informados acima."
          defaultChecked={v?.needsFlight ?? true}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Classe">
              <Select name="cabinClass" defaultValue={v?.cabinClass ?? "ECONOMICA"}>
                {options(CABIN_CLASSES)}
              </Select>
            </Field>
            <Field label="Companhia de preferência">
              <Input
                name="preferredAirline"
                defaultValue={v?.preferredAirline ?? ""}
                placeholder="Latam, Gol, American…"
              />
            </Field>
            <Field label="Preferência de assento">
              <Select name="seatPreference" defaultValue={v?.seatPreference ?? "INDIFERENTE"}>
                {options(SEAT_PREFERENCES)}
              </Select>
            </Field>
            <Field label="Programa de fidelidade a creditar">
              <Input
                name="loyaltyProgram"
                defaultValue={v?.loyaltyProgram ?? ""}
                placeholder="Smiles, Latam Pass…"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="checkedBaggage" defaultChecked={v?.checkedBaggage ?? true} />
            Preciso de bagagem despachada
          </label>
        </ServiceBlock>

        <ServiceBlock
          name="needsHotel"
          defaultChecked={v?.needsHotel ?? false}
          icon={BedDouble}
          title="Hospedagem"
          description="Reserva de hotel para o período da viagem."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cidade">
              <Input name="hotelCity" defaultValue={v?.hotelCity ?? ""} />
            </Field>
            <Field label="Rede ou hotel de preferência">
              <Input
                name="hotelChain"
                defaultValue={v?.hotelChain ?? ""}
                placeholder="Accor, Marriott…"
              />
            </Field>
            <Field label="Check-in">
              <Input name="hotelCheckIn" type="date" defaultValue={v?.hotelCheckIn ?? ""} />
            </Field>
            <Field label="Check-out">
              <Input name="hotelCheckOut" type="date" defaultValue={v?.hotelCheckOut ?? ""} />
            </Field>
            <Field label="Categoria">
              <Select name="hotelCategory" defaultValue={v?.hotelCategory ?? "INDIFERENTE"}>
                {options(HOTEL_CATEGORIES)}
              </Select>
            </Field>
            <Field label="Nº de quartos">
              <Input name="hotelRooms" type="number" min={1} defaultValue={v?.hotelRooms ?? 1} />
            </Field>
            <Field label="Tipo de quarto">
              <Select name="hotelRoomType" defaultValue={v?.hotelRoomType ?? "SINGLE"}>
                {options(ROOM_TYPES)}
              </Select>
            </Field>
            <Field label="Localização de referência">
              <Input
                name="hotelReference"
                defaultValue={v?.hotelReference ?? ""}
                placeholder="Perto do centro de convenções"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="hotelBreakfast" defaultChecked={v?.hotelBreakfast ?? true} />
            Com café da manhã
          </label>
        </ServiceBlock>

        <ServiceBlock
          name="needsTransfer"
          defaultChecked={v?.needsTransfer ?? false}
          icon={Car}
          title="Traslado aeroporto ↔ hotel"
          description="Recepção na chegada e retorno ao aeroporto."
        >
          <Field label="Observações do traslado">
            <Input
              name="transferNotes"
              defaultValue={v?.transferNotes ?? ""}
              placeholder="Nº de bagagens, horário, ponto de encontro…"
            />
          </Field>
        </ServiceBlock>

        <ServiceBlock
          name="needsCarRental"
          defaultChecked={v?.needsCarRental ?? false}
          icon={Car}
          title="Aluguel de carro"
          description="Locação no destino, com ou sem motorista adicional."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <Select name="carCategory" defaultValue={v?.carCategory || "ECONOMICO"}>
                {options(CAR_CATEGORIES)}
              </Select>
            </Field>
            <Field label="Local e data de retirada">
              <Input
                name="carPickup"
                defaultValue={v?.carPickup ?? ""}
                placeholder="Aeroporto ORD, 01/10 às 14h"
              />
            </Field>
            <Field label="Local e data de devolução">
              <Input
                name="carDropoff"
                defaultValue={v?.carDropoff ?? ""}
                placeholder="Mesmo local, 05/10 às 10h"
              />
            </Field>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="carExtraDriver" defaultChecked={v?.carExtraDriver ?? false} />
              Incluir motorista adicional
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="needsChauffeur" defaultChecked={v?.needsChauffeur ?? false} />
              Prefiro motorista à disposição, em vez de dirigir
            </label>
          </div>
        </ServiceBlock>

        {/* Apoio não tem um "serviço-chave": cada item é independente, por isso
            o bloco fica sempre aberto em vez de depender de uma caixa mestre. */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start gap-3">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-bold text-slate-900">Serviços de apoio</p>
                <p className="text-xs text-slate-500">
                  Marque o que você precisa além do transporte e da hospedagem.
                </p>
              </div>
            </div>

            <div className="space-y-4 border-l-2 border-brand-200 pl-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="needsInsurance" defaultChecked={v?.needsInsurance ?? false} />
                Seguro viagem
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="needsCurrency" defaultChecked={v?.needsCurrency ?? false} />
                Câmbio / moeda estrangeira
              </label>
              <Field label="Detalhes do câmbio">
                <Input
                name="currencyNotes"
                defaultValue={v?.currencyNotes ?? ""}
                placeholder="Ex.: US$ 2.000 em espécie + cartão"
              />
              </Field>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="needsVisa" defaultChecked={v?.needsVisa ?? false} />
                Assessoria de visto e documentação
              </label>
              <Field label="Detalhes do visto">
                <Input
                name="visaNotes"
                defaultValue={v?.visaNotes ?? ""}
                placeholder="Ex.: visto americano vencido, preciso renovar"
              />
              </Field>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="needsConnectivity" defaultChecked={v?.needsConnectivity ?? false} />
                Chip / internet internacional
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="needsEventTicket" defaultChecked={v?.needsEventTicket ?? false} />
                Ingresso ou credencial de feira/evento
              </label>
              <Field label="Nome do evento ou feira">
                <Input
                name="eventName"
                defaultValue={v?.eventName ?? ""}
                placeholder="Ex.: Anuga 2026"
              />
              </Field>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------- contexto */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Contexto da viagem</h2>
          <Field label="Motivo da viagem *">
            <Textarea
              name="purpose"
              required
              rows={3}
              defaultValue={v?.purpose ?? ""}
              placeholder="Ex.: participação na feira Anuga, reuniões comerciais com importadores…"
            />
          </Field>
          <Field label="Faixa de orçamento">
            <Input
              name="budget"
              defaultValue={v?.budget ?? ""}
              placeholder="Ex.: até R$ 12.000 por passageiro"
            />
          </Field>
          <Field label="Outras observações">
            <Textarea
              name="notes"
              rows={3}
              defaultValue={v?.notes ?? ""}
              placeholder="Política de viagem da empresa, centro de custo, aprovações necessárias…"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="sendCopy"
              defaultChecked={v?.sendCopy ?? true}
              className="mt-1"
            />
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.75} />
            <span>
              <span className="block text-sm font-bold text-slate-900">
                Receber uma cópia desta solicitação
              </span>
              <span className="block text-xs text-slate-500">
                Enviamos o comprovante do que você pediu para o seu e-mail e
                WhatsApp informados acima.
              </span>
            </span>
          </label>
        </CardBody>
      </Card>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <div className="sticky bottom-4 flex items-center justify-end gap-2">
        {cancelHref && (
          <Link
            href={cancelHref}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </Link>
        )}
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
