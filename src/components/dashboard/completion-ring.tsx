"use client";

import * as React from "react";

/** Birtask-style gradient donut/ring with an inner percentage. */
export function CompletionRing({
  percent,
  label,
  size = 168,
  stroke = 14,
}: {
  percent: number;
  label: string;
  size?: number;
  stroke?: number;
}) {
  const [animate, setAnimate] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = animate ? (Math.min(100, Math.max(0, percent)) / 100) * c : 0;
  const cx = size / 2;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <defs>
          <linearGradient id="gx-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#5B5BF5" />
            <stop offset="50%" stopColor="#B57BFF" />
            <stop offset="100%" stopColor="#FF6FB0" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={stroke} stroke="var(--muted)" opacity={0.4} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="url(#gx-ring)"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(.2,.7,.1,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-extrabold tracking-tight tnum">
          {Math.round(percent)}
          <span className="text-lg text-muted-foreground">%</span>
        </div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
        {label}
      </span>
      <span className="font-bold tnum">{Math.max(0, value)}</span>
    </div>
  );
}
