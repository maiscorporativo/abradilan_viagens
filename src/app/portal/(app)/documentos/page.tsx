import { db } from "@/lib/db";
import { requirePassenger } from "@/lib/auth";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { TRIP_DOC_CATEGORIES, DOC_KINDS, VOUCHER_KINDS } from "@/lib/constants";
import { formatDateTimeBR } from "@/lib/utils";
import { Download, FileText, FolderOpen, Ticket } from "lucide-react";

export default async function DocumentosPage() {
  const session = await requirePassenger();
  const [vouchers, tripDocs, myDocs] = await Promise.all([
    db.voucherTemplate.findMany({
      where: { tripId: session.tripId, visibleToPassenger: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    db.tripDocument.findMany({
      where: {
        tripId: session.tripId,
        visibleToPassenger: true,
        OR: [{ passengerId: null }, { passengerId: session.passengerId }],
      },
      orderBy: { createdAt: "desc" },
    }),
    db.passengerDocument.findMany({
      where: { passengerId: session.passengerId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {vouchers.length > 0 && (
        <div>
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Meus vouchers
          </h2>
          <div className="space-y-2">
            {vouchers.map((v) => (
              <Card key={v.id}>
                <CardBody className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Ticket className="h-8 w-8 shrink-0 text-brand-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {v.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {VOUCHER_KINDS[v.kind] ?? v.kind} · gerado na hora com os
                        seus dados
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/vouchers/${v.id}?passenger=${session.passengerId}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </a>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-base font-bold text-slate-900">
          Documentos da viagem
        </h2>
        {tripDocs.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10" />}
            title="Nenhum documento disponível"
            description="Vouchers, seguros e demais documentos aparecerão aqui quando forem liberados."
          />
        ) : (
          <div className="space-y-2">
            {tripDocs.map((d) => (
              <Card key={d.id}>
                <CardBody className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-8 w-8 shrink-0 text-brand-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {d.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {TRIP_DOC_CATEGORIES[d.category] ?? d.category} ·{" "}
                        {formatDateTimeBR(d.createdAt)}
                        {d.passengerId && (
                          <Badge tone="violet" className="ml-1">Exclusivo para você</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/files/trip-doc/${d.id}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </a>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-base font-bold text-slate-900">
          Meus documentos enviados
        </h2>
        {myDocs.length === 0 ? (
          <p className="text-sm text-slate-500">
            Você ainda não enviou documentos pelo formulário de inscrição.
          </p>
        ) : (
          <div className="space-y-2">
            {myDocs.map((d) => (
              <Card key={d.id}>
                <CardBody className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {d.fileName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {DOC_KINDS[d.kind] ?? d.kind} · {formatDateTimeBR(d.createdAt)}
                    </p>
                  </div>
                  <a
                    href={`/api/files/passenger-doc/${d.id}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </a>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
