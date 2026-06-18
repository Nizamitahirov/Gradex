"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Grid3x3 } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gradeColor, gradeColorSoftDark } from "@/lib/grade-colors";
import { BANDS, bandsForPath, getBand, type BandKey } from "@/lib/grading/bands";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

type Granularity = "path" | "band";

export default function StructurePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { data, isLoading } = useOrgData();
  const org = data?.org;
  const jobs = React.useMemo(() => data?.jobs ?? [], [data]);
  const families = React.useMemo(() => data?.families ?? [], [data]);

  const [granularity, setGranularity] = React.useState<Granularity>("path");
  const [familyId, setFamilyId] = React.useState("all");
  const [onlyFlagged, setOnlyFlagged] = React.useState(false);

  const familyMap = React.useMemo(() => Object.fromEntries(families.map((f) => [f.id, f])), [families]);

  const graded = React.useMemo(
    () =>
      jobs.filter((j) => {
        if (j.currentGrade == null) return false;
        if (familyId !== "all" && j.familyId !== familyId) return false;
        if (onlyFlagged && j.status !== "needs_review" && (j.flags?.length ?? 0) === 0) return false;
        return true;
      }),
    [jobs, familyId, onlyFlagged],
  );

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!org) return null;

  const scoped = org.scoping?.completed
    ? { lo: org.scoping.result.bottomGrade, hi: org.scoping.result.topGrade }
    : { lo: 1, hi: 25 };

  const grades: number[] = [];
  for (let g = scoped.hi; g >= scoped.lo; g--) grades.push(g);

  // Columns
  const columns: { key: string; label: string; path: "IC" | "M"; bands: BandKey[] }[] =
    granularity === "path"
      ? [
          { key: "IC", label: "Individual Contributor", path: "IC", bands: bandsForPath("IC").map((b) => b.key) },
          { key: "M", label: "Management", path: "M", bands: bandsForPath("M").map((b) => b.key) },
        ]
      : BANDS.map((b) => ({ key: b.key, label: b.name, path: b.path, bands: [b.key] }));

  const cellJobs = (grade: number, col: (typeof columns)[number]) =>
    graded.filter((j) => j.currentGrade === grade && col.bands.includes(j.band as BandKey));

  const hasGraded = jobs.some((j) => j.currentGrade != null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade structure"
        description="Your whole job architecture at a glance — jobs arranged by grade and band."
      />

      {!hasGraded ? (
        <EmptyState
          icon={Grid3x3}
          title="Nothing to chart yet"
          description="Grade some jobs and they'll appear here, positioned by grade and band."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="path">By path</TabsTrigger>
                <TabsTrigger value="band">By band</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={familyId} onValueChange={setFamilyId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="flagged" checked={onlyFlagged} onCheckedChange={setOnlyFlagged} />
              <Label htmlFor="flagged" className="cursor-pointer text-sm text-muted-foreground">
                Only flagged
              </Label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="min-w-[640px]">
              {/* Header */}
              <div
                className="grid border-b border-border bg-muted/40"
                style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(120px, 1fr))` }}
              >
                <div className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Grade</div>
                {columns.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "border-l border-border px-3 py-2.5 text-xs font-medium",
                      c.path === "M" ? "text-primary" : "text-info",
                    )}
                  >
                    {c.label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {grades.map((grade) => {
                const c = gradeColor(grade);
                return (
                  <div
                    key={grade}
                    className="grid border-b border-border last:border-0"
                    style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(120px, 1fr))` }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="size-3 rounded-sm" style={{ background: c.solid }} />
                      <span className="text-sm font-medium tnum">{grade}</span>
                    </div>
                    {columns.map((col) => {
                      const items = cellJobs(grade, col);
                      return (
                        <div key={col.key} className="border-l border-border p-1.5">
                          <div className="flex flex-wrap gap-1">
                            {items.map((j) => (
                              <JobChip key={j.id} job={j} familyColor={familyMap[j.familyId]?.color} isDark={isDark} onClick={() => router.push(`/jobs/${j.id}`)} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="font-medium">Grade ramp:</span>
            <div className="flex items-center gap-1">
              {[scoped.lo, Math.round((scoped.lo + scoped.hi) / 2), scoped.hi].map((g) => (
                <span key={g} className="flex items-center gap-1">
                  <span className="size-3 rounded-sm" style={{ background: gradeColor(g).solid }} />
                  <span className="tnum">{g}</span>
                </span>
              ))}
            </div>
            <span>·</span>
            <span>{graded.length} jobs shown</span>
          </div>
        </>
      )}
    </div>
  );
}

function JobChip({
  job,
  familyColor,
  isDark,
  onClick,
}: {
  job: Job;
  familyColor?: string;
  isDark: boolean;
  onClick: () => void;
}) {
  const grade = job.currentGrade!;
  const soft = isDark ? gradeColorSoftDark(grade) : gradeColor(grade);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex max-w-[150px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-transform hover:scale-[1.03]"
          style={{ background: soft.soft, borderColor: soft.softBorder }}
        >
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: familyColor ?? "var(--primary)" }} />
          <span className="truncate">{job.title}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5">
          <p className="font-medium">{job.title}</p>
          <p className="text-muted-foreground">
            {getBand(job.band as BandKey).name} · Grade {grade}
          </p>
          {job.confidence && <p className="text-muted-foreground capitalize">{job.confidence} confidence</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
