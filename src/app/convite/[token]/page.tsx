import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { baseUrl } from "@/lib/portal-config";
import {
  inviteLink, seatInfo, hotelsOf, facilitiesOf, mapsUrl, eventDateLabel,
} from "@/lib/invite-messages";
import { RsvpClient } from "./rsvp-client";
import { MapPin, Calendar, Shirt, Armchair, Hotel, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmar?: string }>;
}) {
  const { token } = await params;
  const { confirmar } = await searchParams;

  const invite = await db.invite.findUnique({
    where: { token },
    include: { trip: true, table: true, company: true },
  });
  if (!invite) notFound();

  const trip = invite.trip;
  if (!trip.invitesEnabled) notFound();

  const base = baseUrl();
  const seat = seatInfo(invite, trip);
  const hotels = hotelsOf(trip);
  const facilities = facilitiesOf(trip);

  // O QR carrega o link do convite: a recepção lê e o credenciamento resolve
  // o token. O código curto abaixo é a alternativa digitável.
  const qrDataUrl = await QRCode.toDataURL(inviteLink(base, invite.token), {
    width: 480,
    margin: 1,
  });

  const canceled = invite.status === "CANCELADO";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <header
          className="px-8 py-10 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${trip.secondaryColor}, ${trip.primaryColor})`,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">
            Convite
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight">
            {trip.emailTitle || trip.name}
          </h1>
        </header>

        <div className="space-y-6 px-7 py-7">
          <div>
            <p className="text-lg text-slate-900">
              Olá, <strong>{invite.name}</strong>!
            </p>
            {(trip.emailText || trip.description) && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {trip.emailText || trip.description}
              </p>
            )}
            {invite.company && (
              <p className="mt-2 text-xs text-slate-400">
                Convite cedido por {invite.company.companyName}
              </p>
            )}
          </div>

          {canceled ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              Este convite foi cancelado. Em caso de dúvida, fale com quem o enviou.
            </p>
          ) : (
            <>
              <dl className="space-y-2.5 rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
                {trip.startDate && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <strong>Data:</strong> {eventDateLabel(trip)}
                      {trip.eventTime ? ` às ${trip.eventTime}` : ""}
                    </span>
                  </div>
                )}
                {trip.venueName && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <strong>Local:</strong> {trip.venueName}
                      {trip.venueAddress ? ` — ${trip.venueAddress}` : ""}
                      <br />
                      <a
                        href={mapsUrl(trip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold"
                        style={{ color: trip.primaryColor }}
                      >
                        Ver no mapa e traçar rota
                      </a>
                    </span>
                  </div>
                )}
                {trip.dressCode && (
                  <div className="flex items-start gap-2.5">
                    <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <strong>Traje:</strong> {trip.dressCode}
                    </span>
                  </div>
                )}
                {seat && (
                  <div className="flex items-start gap-2.5">
                    <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <strong>Seu lugar:</strong> {seat}
                    </span>
                  </div>
                )}
              </dl>

              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR code do convite"
                  width={200}
                  height={200}
                  className="mx-auto rounded-xl border border-slate-200"
                />
                <p className="mt-3 text-xs text-slate-500">
                  Apresente este QR code na recepção para o credenciamento.
                </p>
                {invite.code && (
                  <p className="mt-1 text-xs text-slate-400">
                    Código:{" "}
                    <span className="font-mono tracking-widest text-slate-600">
                      {invite.code}
                    </span>
                  </p>
                )}
              </div>

              <RsvpClient
                token={invite.token}
                initialStatus={invite.status}
                autoConfirm={confirmar === "1"}
                primaryColor={trip.primaryColor}
              />

              {hotels.length > 0 && (
                <section>
                  <h2
                    className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold"
                    style={{ color: trip.secondaryColor }}
                  >
                    <Hotel className="h-4 w-4" /> Hotéis próximos
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {hotels.map((h, i) => (
                      <li key={i}>
                        <strong>{h.nome}</strong>
                        {h.distancia ? ` (${h.distancia})` : ""}
                        {h.endereco ? ` — ${h.endereco}` : ""}
                        {h.telefone ? ` — ${h.telefone}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {facilities.length > 0 && (
                <section>
                  <h2
                    className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold"
                    style={{ color: trip.secondaryColor }}
                  >
                    <Sparkles className="h-4 w-4" /> Comodidades
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {facilities.map((f, i) => (
                      <li key={i}>
                        <strong>{f.titulo}:</strong> {f.descricao}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-slate-100 bg-slate-50 px-7 py-4 text-center text-[11px] text-slate-400">
          {trip.emailFooter || `Convite pessoal e intransferível · ${trip.name}`}
        </footer>
      </div>
    </main>
  );
}
