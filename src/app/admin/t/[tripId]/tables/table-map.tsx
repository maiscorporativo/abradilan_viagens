"use client";

import { useRef, useState } from "react";
import { moveTable } from "./actions";

export type MapTable = {
  id: string;
  number: number;
  name: string;
  capacity: number;
  shape: string;
  x: number;
  y: number;
};

export type MapOccupant = {
  id: string;
  name: string;
  companyName: string;
  tableId: string | null;
  seat: number | null;
};

const RADIUS = 46;

/**
 * Mapa do salão em SVG. Porte de public/js/mapa.js: hover mostra os ocupantes,
 * arrastar reposiciona a mesa (só no modo editável) e o clique abre a
 * acomodação de convidados.
 */
export function TableMap({
  tripId,
  tables,
  occupants,
  editable,
  onSelect,
}: {
  tripId: string;
  tables: MapTable[];
  occupants: MapOccupant[];
  editable: boolean;
  onSelect?: (table: MapTable) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hover, setHover] = useState<{ table: MapTable; x: number; y: number } | null>(
    null
  );
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(
    null
  );

  const posOf = (t: MapTable) => positions[t.id] ?? { x: t.x, y: t.y };

  const width = Math.max(640, ...tables.map((t) => posOf(t).x + 140));
  const height = Math.max(420, ...tables.map((t) => posOf(t).y + 140));

  const occupantsOf = (tableId: string) =>
    occupants
      .filter((o) => o.tableId === tableId)
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

  /** Converte coordenadas de tela em coordenadas do SVG. */
  const toSvgPoint = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  };

  const onPointerDown = (e: React.PointerEvent, t: MapTable) => {
    if (!editable) return;
    const p = toSvgPoint(e);
    const cur = posOf(t);
    dragRef.current = { id: t.id, dx: p.x - cur.x, dy: p.y - cur.y, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toSvgPoint(e);
    drag.moved = true;
    setPositions((prev) => ({
      ...prev,
      [drag.id]: { x: Math.max(RADIUS, p.x - drag.dx), y: Math.max(RADIUS, p.y - drag.dy) },
    }));
  };

  const onPointerUp = async (t: MapTable) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved) {
      // Clique sem arrastar = acomodar convidados nesta mesa.
      onSelect?.(t);
      return;
    }
    const pos = posOf(t);
    await moveTable(tripId, t.id, Math.round(pos.x), Math.round(pos.y));
  };

  return (
    <div className="relative overflow-auto rounded-xl border border-slate-200 bg-white p-2">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full"
      >
        {/* Referência do salão */}
        <rect
          x={width / 2 - 130}
          y={8}
          width={260}
          height={30}
          rx={8}
          fill="#e2e8f0"
        />
        <text
          x={width / 2}
          y={28}
          textAnchor="middle"
          className="fill-slate-500 text-[11px] font-bold tracking-widest"
        >
          PALCO / ENTRADA
        </text>

        {tables.map((t) => {
          const pos = posOf(t);
          const ocs = occupantsOf(t.id);
          const full = ocs.length >= t.capacity;
          const fill = ocs.length === 0 ? "#f1f5f9" : full ? "#b0d9f1" : "#d7ecf8";
          return (
            <g
              key={t.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className={editable ? "cursor-move" : "cursor-pointer"}
              onPointerDown={(e) => onPointerDown(e, t)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(t)}
              onMouseEnter={(e) =>
                setHover({ table: t, x: e.clientX, y: e.clientY })
              }
              onMouseMove={(e) => setHover({ table: t, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
            >
              {t.shape === "RETANGULAR" ? (
                <rect
                  x={-RADIUS - 12}
                  y={-RADIUS + 12}
                  width={(RADIUS + 12) * 2}
                  height={(RADIUS - 12) * 2}
                  rx={10}
                  fill={fill}
                  stroke="#1690d0"
                  strokeWidth={2}
                />
              ) : (
                <circle r={RADIUS} fill={fill} stroke="#1690d0" strokeWidth={2} />
              )}
              <text
                textAnchor="middle"
                y={-4}
                className="fill-slate-900 text-[15px] font-bold"
              >
                {t.number}
              </text>
              <text
                textAnchor="middle"
                y={14}
                className="fill-slate-500 text-[11px]"
              >
                {ocs.length}/{t.capacity}
              </text>
              {t.name && (
                <text
                  textAnchor="middle"
                  y={RADIUS + 16}
                  className="fill-slate-400 text-[10px]"
                >
                  {t.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 max-w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-bold">
            Mesa {hover.table.number}
            {hover.table.name ? ` — ${hover.table.name}` : ""}{" "}
            <span className="font-normal opacity-70">
              ({occupantsOf(hover.table.id).length}/{hover.table.capacity})
            </span>
          </p>
          {occupantsOf(hover.table.id).length === 0 ? (
            <p className="mt-1 opacity-70">Mesa livre</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {occupantsOf(hover.table.id).map((o) => (
                <li key={o.id}>
                  {o.seat ? <strong>{o.seat}. </strong> : null}
                  {o.name}
                  {o.companyName && (
                    <span className="text-brand-300"> · {o.companyName}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
