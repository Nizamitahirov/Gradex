"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PayRow } from "@/lib/pay/scale";
import type { AssignedEmployee, Bucket } from "@/lib/pay/analytics";

const tick = { fontSize: 11, fill: "var(--muted-foreground)" };
const tipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};

export function kfmt(v: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
}

/* ---------- Signature: pay range vs actual salaries ---------- */
export function PayRangeChart({
  assigned,
  rows,
  currency,
}: {
  assigned: AssignedEmployee[];
  rows: PayRow[];
  currency: string;
}) {
  const grades = React.useMemo(
    () => [...new Set(assigned.filter((e) => e.grade != null).map((e) => e.grade!))].sort((a, b) => a - b),
    [assigned],
  );
  const rowByGrade = new Map(rows.map((r) => [r.grade, r]));
  const data = grades.map((g) => {
    const r = rowByGrade.get(g);
    return { g: `G${g}`, lo: r?.ld ?? 0, band: r ? r.ud - r.ld : 0, median: r?.median ?? 0 };
  });
  const points = assigned
    .filter((e) => e.grade != null)
    .map((e) => ({ g: `G${e.grade}`, salary: e.salary, status: e.placement?.status }));

  const dot = (props: { cx?: number; cy?: number; payload?: { status?: string } }) => {
    const { cx, cy, payload } = props;
    const color =
      payload?.status === "underpaid" ? "var(--destructive)" : payload?.status === "overpaid" ? "#F5A524" : "var(--success)";
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--card)" strokeWidth={1.5} />;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="g" tick={tick} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => kfmt(Number(v), currency)} tick={tick} tickLine={false} axisLine={false} width={52} />
        <Tooltip contentStyle={tipStyle} formatter={(v: unknown, n) => [kfmt(Number(v), currency), n === "band" ? "Range width" : n === "median" ? "Median" : "Min"]} />
        {/* range band: invisible base (lo) + visible band (ud-lo) */}
        <Bar dataKey="lo" stackId="r" fill="transparent" />
        <Bar dataKey="band" stackId="r" fill="var(--primary)" fillOpacity={0.14} radius={[4, 4, 4, 4]} />
        <Line dataKey="median" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} name="median" />
        <Scatter data={points} dataKey="salary" shape={dot} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Donut with legend below ---------- */
export function AnalyticsDonut({
  data,
  centerLabel,
}: {
  data: { name: string; value: number; fill: string }[];
  centerLabel: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;
  const display = empty ? [{ name: "No data", value: 1, fill: "var(--muted)" }] : data;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 168, height: 168 }}>
        <ResponsiveContainer width={168} height={168}>
          <PieChart>
            <Pie
              data={display}
              dataKey="value"
              innerRadius={56}
              outerRadius={78}
              paddingAngle={empty ? 0 : 3}
              cornerRadius={6}
              stroke="var(--card)"
              strokeWidth={3}
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {display.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={active === null || active === i ? 1 : 0.32} style={{ transition: "fill-opacity .15s", cursor: "pointer" }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tnum">{active !== null && !empty ? data[active].value : total}</span>
          <span className="text-[11px] text-muted-foreground">{active !== null && !empty ? data[active].name : centerLabel}</span>
        </div>
      </div>
      <div className="grid w-full gap-1">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent">
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.fill }} />
              <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
              <span className="font-bold tnum">{d.value}</span>
              <span className="w-8 text-right text-[11px] text-muted-foreground tnum">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Column chart with value labels ---------- */
export function Columns({ data, color, money, currency }: { data: Bucket[]; color: string; money?: boolean; currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={32} tickFormatter={(v) => (money ? kfmt(Number(v), currency) : `${v}`)} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={tipStyle} formatter={(v: unknown) => (money ? kfmt(Number(v), currency) : `${v}`)} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={color}>
          <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }} formatter={(v) => (money ? kfmt(Number(v), currency) : String(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Horizontal bars (good for long labels) ---------- */
export function HBars({ data, color, money, currency }: { data: { label: string; value: number }[]; color: string; money?: boolean; currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34 + 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => (money ? kfmt(Number(v), currency) : `${v}`)} />
        <YAxis type="category" dataKey="label" tick={{ ...tick, fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={tipStyle} formatter={(v: unknown) => (money ? kfmt(Number(v), currency) : `${v}`)} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={color}>
          <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }} formatter={(v) => (money ? kfmt(Number(v), currency) : String(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Radar (workforce profile across bands) ---------- */
export function ProfileRadar({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip contentStyle={tipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
