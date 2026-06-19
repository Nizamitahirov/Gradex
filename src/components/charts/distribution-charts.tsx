"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { gradeColor } from "@/lib/grade-colors";
import { getBand, type BandKey } from "@/lib/grading/bands";
import type { Family, Job } from "@/types";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value: number }[];
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground tnum">{payload[0].value} jobs</div>
    </div>
  );
}

export function GradeDistributionChart({ jobs, range }: { jobs: Job[]; range: { lo: number; hi: number } }) {
  const data = React.useMemo(() => {
    const counts = new Map<number, number>();
    for (let g = range.lo; g <= range.hi; g++) counts.set(g, 0);
    jobs.forEach((j) => {
      if (j.currentGrade != null) counts.set(j.currentGrade, (counts.get(j.currentGrade) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([grade, count]) => ({ grade, count }));
  }, [jobs, range]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="grade" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.grade} fill={gradeColor(d.grade).solid} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BandDistributionChart({ jobs }: { jobs: Job[] }) {
  const data = React.useMemo(() => {
    const counts = new Map<BandKey, number>();
    jobs.forEach((j) => counts.set(j.band as BandKey, (counts.get(j.band as BandKey) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([band, count]) => ({ band: getBand(band).name, count, key: band }))
      .sort((a, b) => b.count - a.count);
  }, [jobs]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="band"
          tick={{ ...axisStyle, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} fill="var(--primary)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutDatum {
  name: string;
  value: number;
  fill: string;
}

/** Professional donut: rounded segments, hover lift, centered total, rich legend. */
function Donut({ data, centerLabel }: { data: DonutDatum[]; centerLabel: string }) {
  const [active, setActive] = React.useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;
  const display = empty ? [{ name: "No data", value: 1, fill: "var(--muted)" }] : data;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" style={{ width: 168, height: 168 }}>
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
              isAnimationActive
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {display.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.fill}
                  fillOpacity={active === null || active === i ? 1 : 0.32}
                  style={{ transition: "fill-opacity 0.15s", cursor: "pointer" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tight tnum">
            {active !== null && !empty ? data[active].value : total}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {active !== null && !empty ? data[active].name : centerLabel}
          </span>
        </div>
      </div>

      <div className="grid w-full gap-1">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <button
              key={d.name}
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.fill }} />
              <span className="flex-1 truncate text-xs text-muted-foreground">{d.name}</span>
              <span className="text-xs font-bold tnum">{d.value}</span>
              <span className="w-8 text-right text-[11px] text-muted-foreground tnum">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PathSplitDonut({ jobs }: { jobs: Job[] }) {
  const data = React.useMemo<DonutDatum[]>(
    () => [
      { name: "Individual Contributor", value: jobs.filter((j) => j.careerPath === "IC").length, fill: "var(--info)" },
      { name: "Management", value: jobs.filter((j) => j.careerPath === "M").length, fill: "var(--primary)" },
    ],
    [jobs],
  );
  return <Donut data={data} centerLabel="jobs" />;
}

function AvgTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground tnum">Avg grade {payload[0].value}</div>
    </div>
  );
}

export function FamilyComparisonChart({ jobs, families }: { jobs: Job[]; families: Family[] }) {
  const data = React.useMemo(() => {
    return families
      .map((f) => {
        const fjobs = jobs.filter((j) => j.familyId === f.id && j.currentGrade != null);
        const avg = fjobs.length
          ? Math.round((fjobs.reduce((s, j) => s + (j.currentGrade ?? 0), 0) / fjobs.length) * 10) / 10
          : 0;
        return { name: f.name, avg, color: f.color ?? "var(--primary)", count: fjobs.length };
      })
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avg - a.avg);
  }, [jobs, families]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <XAxis type="number" domain={[0, 25]} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...axisStyle, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip content={<AvgTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const CONFIDENCE_META = [
  { key: "high", label: "High", color: "var(--success)" },
  { key: "medium", label: "Medium", color: "#F5A524" },
  { key: "low", label: "Low", color: "var(--destructive)" },
] as const;

export function ConfidenceDonut({ jobs }: { jobs: Job[] }) {
  const data = React.useMemo<DonutDatum[]>(
    () =>
      CONFIDENCE_META.map((m) => ({
        name: m.label,
        value: jobs.filter((j) => j.confidence === m.key).length,
        fill: m.color,
      })),
    [jobs],
  );
  return <Donut data={data} centerLabel="graded" />;
}
