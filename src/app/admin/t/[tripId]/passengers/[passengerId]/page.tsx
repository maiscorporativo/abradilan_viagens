import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, canWrite } from "@/lib/auth";
import { DOC_KINDS } from "@/lib/constants";
import { formatCpf, formatDateTimeBR, toInputDate } from "@/lib/utils";
import { Badge, Card, CardBody, PageHeader } from "@/components/ui";
import { PassengerForm } from "../passenger-form";
import { PassengerDocs } from "./passenger-docs";
import { deletePassenger, regeneratePin } from "../actions";
import { ArrowLeft, KeyRound, Trash2, Plane, Hotel } from "lucide-react";

export default async function PassengerDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; passengerId: string }>;
}) {
  const session = await requireStaff();
  const { tripId, passengerId } = await params;

  const passenger = await db.passenger.findUnique({
    where: { id: passengerId },
    include: {
      group: true,
      titular: { select: { id: true, name: true } },
      companions: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      flights: { include: { flight: true, locator: true } },
      accommodations: { include: { accommodation: true } },
    },
  });
  if (!passenger || passenger.tripId !== tripId) notFound();

  const [titulars, groups] = await Promise.all([
    db.passenger.findMany({
      where: { tripId, type: "TITULAR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.tripGroup.findMany({ where: { tripId }, orderBy: { name: "asc" } }),
  ]);

  const writer = canWrite(session.role);

  return (
    <div>
      <Link
        href={`/admin/t/${tripId}/passengers`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Passageiros
      </Link>
      <PageHeader
        title={passenger.name}
        subtitle={
          <>
            {passenger.cpf ? `CPF ${formatCpf(passenger.cpf)} · ` : ""}
            {passenger.type === "TITULAR" ? "Titular" : `Acompanhante de ${passenger.titular?.name ?? "—"}`}
            {passenger.formFilledAt &&
              ` · Formulário preenchido em ${formatDateTimeBR(passenger.formFilledAt)}`}
          </>
        }
        actions={
          writer && (
            <form
              action={deletePassenger.bind(null, tripId, passengerId)}
            >
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </form>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PassengerForm
            tripId={tripId}
            titulars={titulars}
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            passenger={{
              id: passenger.id,
              type: passenger.type,
              titularId: passenger.titularId ?? "",
              name: passenger.name,
              email: passenger.email,
              phone: passenger.phone,
              cpf: passenger.cpf,
              rg: passenger.rg,
              birthDate: toInputDate(passenger.birthDate),
              passportNumber: passenger.passportNumber,
              passportExpiry: toInputDate(passenger.passportExpiry),
              city: passenger.city,
              uf: passenger.uf,
              category: passenger.category,
              groupId: passenger.groupId ?? "",
              dietary: passenger.dietary,
              medicalNotes: passenger.medicalNotes,
              emergencyName: passenger.emergencyName,
              emergencyPhone: passenger.emergencyPhone,
              notes: passenger.notes,
              rsvpStatus: passenger.rsvpStatus,
              blocked: passenger.blocked,
            }}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <KeyRound className="h-4 w-4 text-brand-700" /> Acesso ao portal
              </h2>
              <p className="text-xs text-slate-500">
                O passageiro entra no portal com CPF + PIN. O PIN inicial é o
                próprio CPF; ele pode trocá-lo depois em “Meus dados”.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg font-bold tracking-widest text-slate-800">
                  {passenger.pin || "——"}
                </span>
                {writer && (
                  <form action={regeneratePin.bind(null, tripId, passengerId)}>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      title="Volta o PIN para o CPF do passageiro (ou gera um aleatório, se não houver CPF)"
                    >
                      Redefinir PIN
                    </button>
                  </form>
                )}
              </div>
              {passenger.blocked && (
                <Badge tone="rose" className="mt-3">Acesso bloqueado</Badge>
              )}
            </CardBody>
          </Card>

          <PassengerDocs
            tripId={tripId}
            passengerId={passengerId}
            canWrite={writer}
            docs={passenger.documents.map((d) => ({
              id: d.id,
              kind: DOC_KINDS[d.kind] ?? d.kind,
              fileName: d.fileName,
              size: d.size,
              createdAt: formatDateTimeBR(d.createdAt),
            }))}
          />

          <Card>
            <CardBody>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Plane className="h-4 w-4 text-brand-700" /> Voos vinculados
              </h2>
              {passenger.flights.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nenhum voo vinculado. Gerencie na aba Voos.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {passenger.flights.map(({ flight, seat, locator }) => (
                    <li key={flight.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="font-semibold">{flight.flightNumber}</span>{" "}
                      {flight.originIata} → {flight.destIata}
                      {(locator?.code || flight.locator) && (
                        <span className="ml-1 font-mono text-xs text-slate-500">
                          · LOC {locator?.code || flight.locator}
                        </span>
                      )}
                      {seat && <span className="ml-1 text-xs text-slate-500">· assento {seat}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Hotel className="h-4 w-4 text-brand-700" /> Hospedagens
              </h2>
              {passenger.accommodations.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nenhuma hospedagem vinculada. Gerencie na aba Hospedagens.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {passenger.accommodations.map(({ accommodation, roomNumber }) => (
                    <li key={accommodation.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="font-semibold">{accommodation.name}</span>
                      {roomNumber && (
                        <span className="ml-1 text-xs text-slate-500">· quarto {roomNumber}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {passenger.companions.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="mb-2 text-sm font-bold text-slate-900">Acompanhantes</h2>
                <ul className="space-y-1 text-sm">
                  {passenger.companions.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/admin/t/${tripId}/passengers/${c.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
