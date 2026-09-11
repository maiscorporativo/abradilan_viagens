"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { checkInByScan, undoCheckIn, type CheckinResult } from "./actions";
import {
  Badge, Button, Card, CardBody, Input, Table, Td, Th,
} from "@/components/ui";
import { formatDateTimeBR } from "@/lib/utils";
import {
  Camera, CameraOff, CheckCircle2, XCircle, ScanLine, Undo2,
} from "lucide-react";

export type CheckedInRow = {
  id: string;
  name: string;
  companyName: string;
  seat: string;
  checkedInAt: string;
};

export function CredenciamentoClient({
  tripId,
  stats,
  recent,
  canWrite,
}: {
  tripId: string;
  stats: { total: number; confirmed: number; checkedIn: number };
  recent: CheckedInRow[];
  canWrite: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<string>("");

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [manual, setManual] = useState("");

  const submit = async (value: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const r = await checkInByScan(tripId, value);
      setResult(r);
    } finally {
      // Pequena pausa evita recredenciar o mesmo QR ainda na frente da câmera.
      setTimeout(() => {
        busyRef.current = false;
        lastCodeRef.current = "";
      }, 2500);
    }
  };

  const stopCamera = () => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data && code.data !== lastCodeRef.current) {
          lastCodeRef.current = code.data;
          void submit(code.data);
        }
      }
    }
    loopRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      loopRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        "Não foi possível acessar a câmera. Use Chrome ou Edge em HTTPS, ou digite o código abaixo."
      );
    }
  };

  useEffect(() => stopCamera, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ScanLine className="h-4 w-4" /> Leitura do QR code
              </h2>
              {scanning ? (
                <Button variant="outline" size="sm" onClick={stopCamera}>
                  <CameraOff className="h-3.5 w-3.5" /> Parar câmera
                </Button>
              ) : (
                <Button size="sm" onClick={startCamera} disabled={!canWrite}>
                  <Camera className="h-3.5 w-3.5" /> Ligar câmera
                </Button>
              )}
            </div>

            <div className="overflow-hidden rounded-xl bg-slate-900">
              <video
                ref={videoRef}
                playsInline
                muted
                className={scanning ? "w-full" : "hidden"}
              />
              {!scanning && (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                  Câmera desligada
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {cameraError && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {cameraError}
              </p>
            )}

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!manual.trim()) return;
                void submit(manual);
                setManual("");
              }}
            >
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Ou digite o código do convite / cole o link"
                disabled={!canWrite}
              />
              <Button type="submit" disabled={!canWrite}>
                Credenciar
              </Button>
            </form>
          </CardBody>
        </Card>

        {result && (
          <Card
            className={
              result.ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
            }
          >
            <CardBody>
              <div className="flex items-start gap-3">
                {result.ok ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
                )}
                <div className="min-w-0">
                  {result.guest ? (
                    <>
                      <p className="text-lg font-bold text-slate-900">
                        {result.guest.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {result.guest.role && `${result.guest.role} · `}
                        {result.guest.companyName || "Convite individual"}
                      </p>
                      {result.guest.seat && (
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {result.guest.seat}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-lg font-bold text-slate-900">
                      Convite não identificado
                    </p>
                  )}
                  <p
                    className={
                      "mt-2 text-sm font-semibold " +
                      (result.ok ? "text-emerald-700" : "text-rose-700")
                    }
                  >
                    {result.ok ? "Credenciado com sucesso." : result.error}
                  </p>
                  {result.guest?.checkedInAt && !result.ok && (
                    <p className="text-xs text-slate-500">
                      Credenciado em {formatDateTimeBR(result.guest.checkedInAt)}
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-3 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Credenciados
              </p>
              <p className="text-3xl font-bold text-brand-700">
                {stats.checkedIn}
                <span className="text-base font-medium text-slate-400">
                  /{stats.total}
                </span>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {stats.confirmed} confirmaram presença antes do evento.
            </p>
          </CardBody>
        </Card>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Últimos credenciamentos
          </p>
          <Table>
            <thead>
              <tr>
                <Th>Convidado</Th>
                <Th>Hora</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <Td colSpan={3}>
                    <span className="text-slate-400">Ninguém credenciado ainda.</span>
                  </Td>
                </tr>
              )}
              {recent.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    {r.seat && <Badge tone="teal">{r.seat}</Badge>}
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">
                      {formatDateTimeBR(r.checkedInAt)}
                    </span>
                  </Td>
                  <Td>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Desfazer credenciamento"
                        onClick={async () => {
                          if (!confirm(`Desfazer o credenciamento de ${r.name}?`)) return;
                          await undoCheckIn(tripId, r.id);
                        }}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
