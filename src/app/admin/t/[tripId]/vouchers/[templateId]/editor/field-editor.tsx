"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveTemplateFields } from "../../actions";
import { FIELD_SOURCES, type PlacedField } from "@/lib/voucher-fields";
import { Button, Card, CardBody, Field, Input, Select } from "@/components/ui";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal,
  AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal,
  AlignStartVertical, AlignVerticalDistributeCenter, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2, Plus, Save, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PdfPageInfo = { width: number; height: number };
/** Caixa do campo em frações da página (x/y = canto superior esquerdo). */
type Box = { x: number; y: number; w: number; h: number };

const clamp = (v: number) => Math.min(0.98, Math.max(0, v));

export function FieldEditor({
  tripId,
  templateId,
  pdfUrl,
  initialFields,
}: {
  tripId: string;
  templateId: string;
  pdfUrl: string;
  initialFields: string;
}) {
  const [fields, setFields] = useState<PlacedField[]>(() => {
    try {
      return JSON.parse(initialFields || "[]");
    } catch {
      return [];
    }
  });
  const [page, setPage] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [pageInfo, setPageInfo] = useState<PdfPageInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<
    { x0: number; y0: number; x1: number; y1: number } | null
  >(null);
  const [newSource, setNewSource] = useState("passenger.name");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  // arrasto: posição inicial do ponteiro + origem de cada campo selecionado
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  // rect vive num ref (além do state) para o pointerup ler o valor mais atual
  const marqueeRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    additive: boolean;
  } | null>(null);
  const fieldEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const pageFields = fields.filter((f) => f.page === page);
  const selectedFields = pageFields.filter((f) => selectedIds.has(f.id));
  const selected = selectedFields.length === 1 ? selectedFields[0] : null;

  // Carrega o PDF via pdfjs e renderiza a página atual no canvas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Servido como .js: a Hostinger entrega .mjs com MIME text/plain,
        // o que faz o navegador rejeitar o module worker do pdf.js.
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        if (!pdfDocRef.current) {
          pdfDocRef.current = await pdfjs.getDocument({ url: pdfUrl }).promise;
          if (cancelled) return;
          setNumPages(pdfDocRef.current.numPages);
        }
        const pdfPage = await pdfDocRef.current.getPage(page + 1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const containerWidth = Math.min(
          820,
          canvas.parentElement?.clientWidth ?? 820
        );
        const viewport0 = pdfPage.getViewport({ scale: 1 });
        const scale = containerWidth / viewport0.width;
        const viewport = pdfPage.getViewport({ scale });

        canvas.width = viewport.width * (window.devicePixelRatio || 1);
        canvas.height = viewport.height * (window.devicePixelRatio || 1);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext("2d")!;
        ctx.setTransform(
          window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0
        );
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setPageInfo({ width: viewport.width, height: viewport.height });
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPdfError("Não foi possível carregar o PDF do template.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, page]);

  /** Troca de página: a seleção da página anterior não faz mais sentido. */
  const goToPage = (next: number) => {
    setPage(next);
    setSelectedIds(new Set());
  };

  const addField = () => {
    const id = `f${Date.now().toString(36)}`;
    const field: PlacedField = {
      id,
      source: newSource,
      label: FIELD_SOURCES[newSource] ?? newSource,
      custom: newSource === "custom" ? "Digite o texto…" : undefined,
      page,
      x: 0.1,
      y: 0.1,
      size: 11,
      bold: false,
      color: "#0f172a",
    };
    setFields((prev) => [...prev, field]);
    setSelectedIds(new Set([id]));
    setStatus("idle");
  };

  /** Aplica um patch a todos os campos selecionados. */
  const updateSelection = (patch: Partial<PlacedField>) => {
    if (selectedIds.size === 0) return;
    setFields((prev) =>
      prev.map((f) => (selectedIds.has(f.id) ? { ...f, ...patch } : f))
    );
    setStatus("idle");
  };

  const removeSelection = useCallback(() => {
    setFields((prev) => prev.filter((f) => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
    setStatus("idle");
  }, [selectedIds]);

  /** Caixa de um campo em frações da página, medida no DOM. */
  const boxOf = useCallback(
    (f: PlacedField): Box | null => {
      const el = fieldEls.current.get(f.id);
      if (!el || !pageInfo) return null;
      return {
        x: f.x,
        y: f.y,
        w: el.offsetWidth / pageInfo.width,
        h: el.offsetHeight / pageInfo.height,
      };
    },
    [pageInfo]
  );

  // -------------------------------------------------------------------------
  // Seleção
  // -------------------------------------------------------------------------
  const selectField = (id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      // já selecionado: preserva o grupo, para arrastar todos juntos
      return prev.has(id) ? prev : new Set([id]);
    });
  };

  // -------------------------------------------------------------------------
  // Arrasto (move todos os campos selecionados juntos)
  // -------------------------------------------------------------------------
  const onFieldPointerDown = (e: React.PointerEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    selectField(field.id, additive);

    const overlay = overlayRef.current;
    if (!overlay || !pageInfo) return;

    // arrasta a seleção atual — incluindo o campo recém-clicado
    const ids = new Set(selectedIds);
    if (additive) {
      if (ids.has(field.id)) ids.delete(field.id);
      else ids.add(field.id);
    } else if (!ids.has(field.id)) {
      ids.clear();
      ids.add(field.id);
    }
    const origins = new Map<string, { x: number; y: number }>();
    for (const f of fields) {
      if (ids.has(f.id) && f.page === page) origins.set(f.id, { x: f.x, y: f.y });
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, origins };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (e.target !== overlayRef.current) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!additive) setSelectedIds(new Set());
    const start = {
      x0: e.clientX - rect.left,
      y0: e.clientY - rect.top,
      x1: e.clientX - rect.left,
      y1: e.clientY - rect.top,
    };
    marqueeRef.current = { ...start, additive };
    setMarquee(start);
    overlay.setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const overlay = overlayRef.current;
      if (!overlay || !pageInfo) return;

      const drag = dragRef.current;
      if (drag) {
        const dx = (e.clientX - drag.startX) / pageInfo.width;
        const dy = (e.clientY - drag.startY) / pageInfo.height;
        setFields((prev) =>
          prev.map((f) => {
            const origin = drag.origins.get(f.id);
            return origin
              ? { ...f, x: clamp(origin.x + dx), y: clamp(origin.y + dy) }
              : f;
          })
        );
        setStatus("idle");
        return;
      }

      const band = marqueeRef.current;
      if (band) {
        const rect = overlay.getBoundingClientRect();
        band.x1 = e.clientX - rect.left;
        band.y1 = e.clientY - rect.top;
        setMarquee({ x0: band.x0, y0: band.y0, x1: band.x1, y1: band.y1 });
      }
    },
    [pageInfo]
  );

  const onPointerUp = () => {
    dragRef.current = null;
    const band = marqueeRef.current;
    if (band && pageInfo) {
      const left = Math.min(band.x0, band.x1);
      const right = Math.max(band.x0, band.x1);
      const top = Math.min(band.y0, band.y1);
      const bottom = Math.max(band.y0, band.y1);
      // clique simples (sem arrastar) não seleciona nada
      if (right - left > 3 || bottom - top > 3) {
        const hits = pageFields.filter((f) => {
          const el = fieldEls.current.get(f.id);
          if (!el) return false;
          const fl = f.x * pageInfo.width;
          const ft = f.y * pageInfo.height;
          return (
            fl < right &&
            fl + el.offsetWidth > left &&
            ft < bottom &&
            ft + el.offsetHeight > top
          );
        });
        setSelectedIds((prev) => {
          const next = band.additive ? new Set(prev) : new Set<string>();
          for (const f of hits) next.add(f.id);
          return next;
        });
      }
    }
    marqueeRef.current = null;
    setMarquee(null);
  };

  // -------------------------------------------------------------------------
  // Teclado: setas movem, Delete apaga, Ctrl+A seleciona tudo, Esc limpa
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(
          new Set(fields.filter((f) => f.page === page).map((f) => f.id))
        );
        return;
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        return;
      }
      if (selectedIds.size === 0) return;
      if (e.key === "Delete") {
        e.preventDefault();
        removeSelection();
        return;
      }

      const step = e.shiftKey ? 10 : 1; // px na página renderizada
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;

      e.preventDefault();
      if (!pageInfo) return;
      const fx = dx / pageInfo.width;
      const fy = dy / pageInfo.height;
      setFields((prev) =>
        prev.map((f) =>
          selectedIds.has(f.id)
            ? { ...f, x: clamp(f.x + fx), y: clamp(f.y + fy) }
            : f
        )
      );
      setStatus("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, pageInfo, fields, page, removeSelection]);

  // -------------------------------------------------------------------------
  // Alinhamento e distribuição da seleção
  // -------------------------------------------------------------------------
  const align = (mode: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") => {
    const boxes = selectedFields
      .map((f) => ({ f, b: boxOf(f) }))
      .filter((i): i is { f: PlacedField; b: Box } => !!i.b);
    if (boxes.length < 2) return;

    const minX = Math.min(...boxes.map((i) => i.b.x));
    const maxR = Math.max(...boxes.map((i) => i.b.x + i.b.w));
    const minY = Math.min(...boxes.map((i) => i.b.y));
    const maxB = Math.max(...boxes.map((i) => i.b.y + i.b.h));
    const cx = (minX + maxR) / 2;
    const cy = (minY + maxB) / 2;

    const next = new Map<string, { x?: number; y?: number }>();
    for (const { f, b } of boxes) {
      if (mode === "left") next.set(f.id, { x: minX });
      else if (mode === "right") next.set(f.id, { x: maxR - b.w });
      else if (mode === "hcenter") next.set(f.id, { x: cx - b.w / 2 });
      else if (mode === "top") next.set(f.id, { y: minY });
      else if (mode === "bottom") next.set(f.id, { y: maxB - b.h });
      else if (mode === "vmiddle") next.set(f.id, { y: cy - b.h / 2 });
    }
    applyPositions(next);
  };

  /** Espaçamento uniforme entre os campos, do primeiro ao último. */
  const distribute = (axis: "h" | "v") => {
    const boxes = selectedFields
      .map((f) => ({ f, b: boxOf(f) }))
      .filter((i): i is { f: PlacedField; b: Box } => !!i.b)
      .sort((a, z) => (axis === "h" ? a.b.x - z.b.x : a.b.y - z.b.y));
    if (boxes.length < 3) return;

    const first = boxes[0].b;
    const last = boxes[boxes.length - 1].b;
    const span =
      axis === "h" ? last.x + last.w - first.x : last.y + last.h - first.y;
    const totalSize = boxes.reduce(
      (sum, i) => sum + (axis === "h" ? i.b.w : i.b.h),
      0
    );
    const gap = (span - totalSize) / (boxes.length - 1);

    const next = new Map<string, { x?: number; y?: number }>();
    let cursor = axis === "h" ? first.x : first.y;
    for (const { f, b } of boxes) {
      next.set(f.id, axis === "h" ? { x: cursor } : { y: cursor });
      cursor += (axis === "h" ? b.w : b.h) + gap;
    }
    applyPositions(next);
  };

  const applyPositions = (
    positions: Map<string, { x?: number; y?: number }>
  ) => {
    setFields((prev) =>
      prev.map((f) => {
        const p = positions.get(f.id);
        if (!p) return f;
        return {
          ...f,
          x: p.x !== undefined ? clamp(p.x) : f.x,
          y: p.y !== undefined ? clamp(p.y) : f.y,
        };
      })
    );
    setStatus("idle");
  };

  const save = () => {
    startSaving(async () => {
      const result = await saveTemplateFields(tripId, templateId, fields);
      setStatus(result.ok ? "saved" : "error");
    });
  };

  const alignButtons: {
    key: Parameters<typeof align>[0];
    icon: React.ReactNode;
    title: string;
  }[] = [
    { key: "left", icon: <AlignStartVertical className="h-3.5 w-3.5" />, title: "Alinhar à esquerda" },
    { key: "hcenter", icon: <AlignCenterVertical className="h-3.5 w-3.5" />, title: "Centralizar na horizontal" },
    { key: "right", icon: <AlignEndVertical className="h-3.5 w-3.5" />, title: "Alinhar à direita" },
    { key: "top", icon: <AlignStartHorizontal className="h-3.5 w-3.5" />, title: "Alinhar pelo topo" },
    { key: "vmiddle", icon: <AlignCenterHorizontal className="h-3.5 w-3.5" />, title: "Centralizar na vertical" },
    { key: "bottom", icon: <AlignEndHorizontal className="h-3.5 w-3.5" />, title: "Alinhar pela base" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* Palco: PDF + campos arrastáveis */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-semibold text-slate-600">
              Página {page + 1} de {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= numPages - 1}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {status === "saved" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Layout salvo
              </span>
            )}
            {status === "error" && (
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" /> Erro ao salvar
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar layout
            </Button>
          </div>
        </div>

        <div className="relative inline-block overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          {loading && (
            <div className="flex h-96 w-[600px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}
          {pdfError && (
            <div className="flex h-96 w-[600px] items-center justify-center p-6 text-sm text-rose-600">
              {pdfError}
            </div>
          )}
          <canvas ref={canvasRef} className={loading || pdfError ? "hidden" : "block"} />
          {pageInfo && !pdfError && (
            <div
              ref={overlayRef}
              className="absolute inset-0"
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {pageFields.map((f) => (
                <div
                  key={f.id}
                  ref={(el) => {
                    if (el) fieldEls.current.set(f.id, el);
                    else fieldEls.current.delete(f.id);
                  }}
                  onPointerDown={(e) => onFieldPointerDown(e, f)}
                  className={cn(
                    "absolute cursor-grab touch-none select-none whitespace-pre rounded px-1 leading-tight ring-1 active:cursor-grabbing",
                    selectedIds.has(f.id)
                      ? "bg-sun-400/30 ring-2 ring-ember-500"
                      : "bg-brand-100/60 ring-brand-300 hover:ring-brand-500"
                  )}
                  style={{
                    left: f.x * pageInfo.width,
                    top: f.y * pageInfo.height,
                    fontSize: `${f.size * (pageInfo.width / 595.28)}px`,
                    fontWeight: f.bold ? 700 : 400,
                    color: f.color || "#0f172a",
                    fontFamily: "Helvetica, Arial, sans-serif",
                  }}
                  title={f.label}
                >
                  {f.source === "custom"
                    ? f.custom || "Texto livre"
                    : `{${f.label}}`}
                </div>
              ))}

              {marquee && (
                <div
                  className="pointer-events-none absolute border border-dashed border-brand-600 bg-brand-500/10"
                  style={{
                    left: Math.min(marquee.x0, marquee.x1),
                    top: Math.min(marquee.y0, marquee.y1),
                    width: Math.abs(marquee.x1 - marquee.x0),
                    height: Math.abs(marquee.y1 - marquee.y0),
                  }}
                />
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Arraste um retângulo sobre o PDF para selecionar vários campos, ou
          clique segurando <strong>Shift</strong>. Com a seleção feita, as{" "}
          <strong>setas do teclado</strong> movem 1 px por vez (
          <strong>Shift + seta</strong> move 10 px) e os botões de alinhamento
          deixam tudo na mesma linha ou coluna. A posição é salva em proporção à
          página, então a impressão sai exatamente onde você posicionou.
        </p>
      </div>

      {/* Painel lateral */}
      <div className="space-y-4">
        <Card>
          <CardBody className="p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Adicionar campo</h2>
            <div className="flex gap-2">
              <Select
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="flex-1"
              >
                {Object.entries(FIELD_SOURCES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Button size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              O campo entra no canto superior esquerdo da página atual — arraste
              para a posição desejada.
            </p>
          </CardBody>
        </Card>

        {selectedFields.length > 0 ? (
          <Card>
            <CardBody className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {selected
                    ? selected.label
                    : `${selectedFields.length} campos selecionados`}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  onClick={removeSelection}
                  title="Excluir selecionados (tecla Delete)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {selectedFields.length > 1 && (
                <div className="rounded-lg border border-slate-200 p-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Alinhar
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {alignButtons.map((b) => (
                      <Button
                        key={b.key}
                        variant="outline"
                        size="sm"
                        title={b.title}
                        onClick={() => align(b.key)}
                      >
                        {b.icon}
                      </Button>
                    ))}
                  </div>
                  {selectedFields.length > 2 && (
                    <>
                      <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Distribuir com espaçamento igual
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Distribuir na horizontal"
                          onClick={() => distribute("h")}
                        >
                          <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Distribuir na vertical"
                          onClick={() => distribute("v")}
                        >
                          <AlignVerticalDistributeCenter className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selected?.source === "custom" && (
                <Field label="Texto (ex.: observações do voucher)">
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-sun-400/60"
                    value={selected.custom ?? ""}
                    onChange={(e) => updateSelection({ custom: e.target.value })}
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tamanho (pt)">
                  <Input
                    type="number"
                    min={6}
                    max={48}
                    value={selected ? selected.size : ""}
                    placeholder={selected ? undefined : "vários"}
                    onChange={(e) =>
                      updateSelection({ size: Number(e.target.value) || 11 })
                    }
                  />
                </Field>
                <Field label="Cor">
                  <Input
                    type="color"
                    value={selected?.color ?? "#0f172a"}
                    onChange={(e) => updateSelection({ color: e.target.value })}
                    className="h-10 w-full p-1"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedFields.every((f) => f.bold)}
                  onChange={(e) => updateSelection({ bold: e.target.checked })}
                />
                Negrito
              </label>
              {selectedFields.length > 1 && (
                <p className="text-[11px] text-slate-400">
                  Tamanho, cor e negrito são aplicados a todos os{" "}
                  {selectedFields.length} campos selecionados.
                </p>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-4 text-xs text-slate-500">
              Clique em um campo sobre o PDF para editar tamanho, cor, negrito ou
              o texto livre. Arraste um retângulo (ou use Shift + clique) para
              selecionar vários e alinhá-los de uma vez.
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="p-4">
            <h2 className="mb-2 text-sm font-bold text-slate-900">
              Campos desta página ({pageFields.length})
            </h2>
            {pageFields.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum campo nesta página.</p>
            ) : (
              <ul className="space-y-1">
                {pageFields.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={(e) =>
                        selectField(f.id, e.shiftKey || e.ctrlKey || e.metaKey)
                      }
                      className={cn(
                        "w-full truncate rounded-lg px-2 py-1 text-left text-xs",
                        selectedIds.has(f.id)
                          ? "bg-brand-50 font-semibold text-brand-700"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {f.source === "custom" ? `"${(f.custom ?? "").slice(0, 40)}"` : f.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
