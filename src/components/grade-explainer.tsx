"use client";

import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { GradingResult } from "@/lib/grading/engine";
import { getBand, type BandKey } from "@/lib/grading/bands";

/** Full "show the work" explainability view (SPEC.md §9.4). */
export function GradeExplainer({
  result,
  band,
}: {
  result: GradingResult;
  band: BandKey;
}) {
  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-5">
        <GradeBadge grade={result.finalGrade} size="xl" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Final global grade</p>
          <p className="text-2xl font-semibold">
            Grade {result.finalGrade}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              of {getBand(band).name}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={result.confidence} />
            <Badge variant="outline">
              Band window {result.bandWindow.lo}–{result.bandWindow.hi}
            </Badge>
          </div>
        </div>
      </div>

      {/* Per-factor breakdown */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Factor</th>
              <th className="px-3 py-2 text-left font-medium">Selected level</th>
              <th className="px-3 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {result.breakdown.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{b.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{b.levelLabel}</td>
                <td className="px-3 py-2 text-right tnum">{b.score}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30">
              <td className="px-3 py-2 font-medium" colSpan={2}>
                Raw score
              </td>
              <td className="px-3 py-2 text-right font-semibold tnum">
                {result.rawScore} / {result.rMax}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mapping explanation */}
      <p className="text-sm text-muted-foreground">
        Mapping {result.rawScore} of a possible {result.rMax} onto the 1–25 scale yields a computed
        grade of <span className="font-medium text-foreground tnum">{result.computedGrade}</span>,
        constrained to the organization&apos;s scoped range for a final grade of{" "}
        <span className="font-medium text-foreground tnum">{result.finalGrade}</span>.
      </p>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground dark:text-warning">
            <AlertTriangle className="size-4" /> {result.flags.length} item{result.flags.length > 1 ? "s" : ""} to review
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {result.flags.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
