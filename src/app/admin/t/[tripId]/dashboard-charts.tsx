"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardBody } from "@/components/ui";
import { RSVP_STATUS } from "@/lib/constants";

// Paleta da marca Mais Corporativo, validada para gráficos (banda de
// luminância, croma, CVD e contraste OK sobre superfície clara)
const PRIMARY = "#1d5288";
const STATUS_COLORS: Record<string, string> = {
  CONFIRMADO: "#15803d",
  PENDENTE: "#d97706",
  RECUSADO: "#e11d48",
  CANCELADO: "#64748b",
};

type Datum = { name: string; value: number };

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(15,23,42,.08)",
};

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {empty ? (
          <p className="flex h-48 items-center justify-center text-xs text-slate-400">
            Sem dados suficientes.
          </p>
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}

function HorizontalBars({
  data,
  color = PRIMARY,
  colorByName,
}: {
  data: (Datum & { color?: string })[];
  color?: string;
  colorByName?: Record<string, string>;
}) {
  const height = Math.max(160, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#475569" }}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
        <Bar
          dataKey="value"
          name="Passageiros"
          barSize={14}
          radius={[0, 4, 4, 0]}
          label={{ position: "right", fontSize: 11, fill: "#334155" }}
        >
          {data.map((d) => (
            <Cell
              key={d.name}
              fill={d.color ?? colorByName?.[d.name] ?? color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardCharts({
  byUf,
  byCategory,
  byRsvp,
  byGroup,
  byAirline,
  byDay,
}: {
  byUf: Datum[];
  byCategory: Datum[];
  byRsvp: Datum[];
  byGroup: (Datum & { color: string })[];
  byAirline: Datum[];
  byDay: Datum[];
}) {
  const rsvpData = byRsvp.map((d) => ({
    ...d,
    label: RSVP_STATUS[d.name] ?? d.name,
  }));

  const dayData = byDay.map((d) => ({
    ...d,
    label: `${d.name.slice(8, 10)}/${d.name.slice(5, 7)}`,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Confirmações (RSVP)" empty={rsvpData.length === 0}>
        <HorizontalBars
          data={rsvpData.map((d) => ({ name: d.label, value: d.value }))}
          colorByName={Object.fromEntries(
            rsvpData.map((d) => [d.label, STATUS_COLORS[d.name] ?? PRIMARY])
          )}
        />
      </ChartCard>

      <ChartCard title="Inscrições por dia (formulário)" empty={dayData.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dayData} margin={{ left: 0, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#475569" }}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#475569" }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              name="Inscrições"
              stroke={PRIMARY}
              strokeWidth={2}
              dot={{ r: 3, fill: PRIMARY }}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Passageiros por UF de origem" empty={byUf.length === 0}>
        <HorizontalBars data={byUf.slice(0, 12)} />
      </ChartCard>

      <ChartCard title="Passageiros por categoria" empty={byCategory.length === 0}>
        <HorizontalBars data={byCategory.slice(0, 10)} />
      </ChartCard>

      <ChartCard title="Passageiros por grupo" empty={byGroup.length === 0}>
        <HorizontalBars data={byGroup} />
      </ChartCard>

      <ChartCard title="Passageiros por companhia aérea" empty={byAirline.length === 0}>
        <HorizontalBars data={byAirline.slice(0, 10)} />
      </ChartCard>
    </div>
  );
}
