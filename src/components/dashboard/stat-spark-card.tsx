"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "indigo" | "pink" | "info" | "success" | "warn" | "cyan";

const ACCENT: Record<Accent, { var: string; tintBg: string; tintFg: string }> = {
  indigo: { var: "var(--primary)", tintBg: "rgba(91,91,245,0.12)", tintFg: "var(--primary)" },
  pink: { var: "#E879C8", tintBg: "rgba(232,121,200,0.14)", tintFg: "#E879C8" },
  info: { var: "var(--info)", tintBg: "rgba(77,171,247,0.14)", tintFg: "var(--info)" },
  success: { var: "var(--success)", tintBg: "rgba(22,192,152,0.14)", tintFg: "var(--success)" },
  warn: { var: "#F5A524", tintBg: "rgba(245,165,36,0.16)", tintFg: "#F5A524" },
  cyan: { var: "#06B6D4", tintBg: "rgba(6,182,212,0.14)", tintFg: "#06B6D4" },
};

/** Birtask-style stat card: icon, delta pill, big value, label/total, sparkline. */
export function StatSparkCard({
  icon: Icon,
  label,
  value,
  total,
  delta,
  deltaDir = "up",
  points,
  accent = "indigo",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  total?: number | string;
  delta?: string;
  deltaDir?: "up" | "down";
  points: number[];
  accent?: Accent;
}) {
  const a = ACCENT[accent];
  const pts = points.length > 1 ? points : [0, 0];
  const max = Math.max(...pts, 1);
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * 100},${30 - (p / max) * 24}`)
    .join(" ");
  const area = `${line} L 100,30 L 0,30 Z`;
  const id = React.useId().replace(/:/g, "");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5">
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: a.var }} />
      <div className="flex items-start justify-between">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{ background: a.tintBg, color: a.tintFg }}
        >
          <Icon className="size-5" />
        </div>
        {delta && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              deltaDir === "up" ? "text-success" : "text-destructive",
            )}
            style={{
              background: deltaDir === "up" ? "rgba(22,192,152,0.12)" : "rgba(255,106,106,0.12)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight tnum">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-muted-foreground">
        {label}
        {total !== undefined && <span className="text-muted-foreground/60"> / {total}</span>}
      </div>
      <svg className="mt-3 h-8 w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={a.var} stopOpacity="0.25" />
            <stop offset="100%" stopColor={a.var} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={a.var} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
