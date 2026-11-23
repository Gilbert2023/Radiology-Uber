"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

export const PALETTE = ["#1f3f7a", "#179f8b", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9", "#64748b", "#10b981", "#ec4899", "#84cc16"];
const axis = { fontSize: 11, fill: "#64748b" };
const fmtLabel = (v: any) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : v);

export function Bars({ data, x, series, height = 260, stacked, horizontal }: { data: any[]; x: string; series: { key: string; label: string; color?: string }[]; height?: number; stacked?: boolean; horizontal?: boolean }) {
  if (!data.length) return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No data for this period</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 40 : -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={!!horizontal} horizontal={!horizontal} />
        {horizontal ? <><XAxis type="number" tick={axis} allowDecimals={false} /><YAxis type="category" dataKey={x} tick={axis} width={110} /></>
          : <><XAxis dataKey={x} tick={axis} tickFormatter={fmtLabel} /><YAxis tick={axis} allowDecimals={false} /></>}
        <Tooltip labelFormatter={fmtLabel} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Bar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? PALETTE[i]} stackId={stacked ? "a" : undefined} radius={stacked ? 0 : [4, 4, 0, 0]} maxBarSize={36} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Lines({ data, x, series, height = 260, area, unit }: { data: any[]; x: string; series: { key: string; label: string; color?: string }[]; height?: number; area?: boolean; unit?: string }) {
  if (!data.length) return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No data for this period</div>;
  const C: any = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <C data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={x} tick={axis} tickFormatter={fmtLabel} /><YAxis tick={axis} unit={unit} />
        <Tooltip labelFormatter={fmtLabel} formatter={(v: any) => (typeof v === "number" ? v.toFixed(1) : v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => area
          ? <Area isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? PALETTE[i]} fill={s.color ?? PALETTE[i]} fillOpacity={0.15} strokeWidth={2} />
          : <Line isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? PALETTE[i]} strokeWidth={2} dot={false} connectNulls />)}
      </C>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (!total) return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={(v: any) => `${v} (${((v / total) * 100).toFixed(1)}%)`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
