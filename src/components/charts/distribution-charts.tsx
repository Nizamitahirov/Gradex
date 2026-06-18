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

export function PathSplitDonut({ jobs }: { jobs: Job[] }) {
  const data = React.useMemo(() => {
    const ic = jobs.filter((j) => j.careerPath === "IC").length;
    const m = jobs.filter((j) => j.careerPath === "M").length;
    return [
      { name: "Individual Contributor", value: ic, fill: "var(--info)" },
      { name: "Management", value: m, fill: "var(--primary)" },
    ];
  }, [jobs]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium tnum">
              {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const data = React.useMemo(() => {
    return CONFIDENCE_META.map((m) => ({
      name: m.label,
      value: jobs.filter((j) => j.confidence === m.key).length,
      fill: m.color,
    }));
  }, [jobs]);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-bold tnum">
              {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
