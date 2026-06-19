"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { gradeColor } from "@/lib/grade-colors";
import { getBand, type BandKey } from "@/lib/grading/bands";
import type { Family, Job } from "@/types";

/** A distinct, document-style structure listing grouped by grade (high → low). */
export function StructureTable({ jobs, families }: { jobs: Job[]; families: Family[] }) {
  const router = useRouter();
  const familyMap = React.useMemo(() => Object.fromEntries(families.map((f) => [f.id, f])), [families]);

  const groups = React.useMemo(() => {
    const map = new Map<number, Job[]>();
    for (const j of jobs) {
      if (j.currentGrade == null) continue;
      const arr = map.get(j.currentGrade) ?? [];
      arr.push(j);
      map.set(j.currentGrade, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([grade, list]) => ({ grade, list: list.sort((a, b) => a.title.localeCompare(b.title)) }));
  }, [jobs]);

  if (!groups.length) {
    return <p className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">No graded jobs.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(({ grade, list }) => {
        const c = gradeColor(grade);
        return (
          <div key={grade} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            {/* Grade band header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: `color-mix(in oklch, ${c.solid} 12%, var(--card))` }}>
              <GradeBadge grade={grade} size="md" />
              <div className="flex-1">
                <div className="text-sm font-bold">Grade {grade}</div>
                <div className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? "job" : "jobs"}</div>
              </div>
              <span className="h-1.5 w-16 rounded-full" style={{ background: c.solid }} />
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {list.map((j) => {
                const fam = familyMap[j.familyId];
                const band = getBand(j.band as BandKey);
                return (
                  <button
                    key={j.id}
                    onClick={() => router.push(`/jobs/${j.id}`)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50 sm:grid-cols-[minmax(0,2fr)_140px_150px_120px_24px]"
                  >
                    <span className="truncate font-medium">{j.title}</span>
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                      {fam && <span className="size-2 shrink-0 rounded-full" style={{ background: fam.color ?? "var(--primary)" }} />}
                      <span className="truncate">{fam?.name ?? "—"}</span>
                    </span>
                    <span className="hidden sm:block">
                      <Badge variant="secondary" className="font-mono text-[11px]">{band.code}</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{j.careerPath === "M" ? "Mgmt" : "IC"}</span>
                    </span>
                    <span className="hidden justify-self-start sm:block">
                      <ConfidenceBadge confidence={j.confidence} />
                    </span>
                    <ChevronRight className="size-4 justify-self-end text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
