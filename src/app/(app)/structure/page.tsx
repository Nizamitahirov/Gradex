"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Grid3x3, ArrowLeftRight, EyeOff, FileDown } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { Button } from "@/components/ui/button";
import { ExplainWithAI } from "@/components/analytics/explain-with-ai";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StructureTable } from "@/components/structure-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gradeColor, gradeColorSoftDark } from "@/lib/grade-colors";
import { BANDS, bandsForPath, getBand, type BandKey } from "@/lib/grading/bands";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

type View = "matrix" | "table";
type Granularity = "path" | "band";
interface Segment { key: string; label: string; path: "IC" | "M"; bands: BandKey[] }

export default function StructurePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { data, isLoading } = useOrgData();
  const org = data?.org;
  const jobs = React.useMemo(() => data?.jobs ?? [], [data]);
  const families = React.useMemo(() => data?.families ?? [], [data]);

  const [view, setView] = React.useState<View>("matrix");
  const [granularity, setGranularity] = React.useState<Granularity>("path");
  const [swap, setSwap] = React.useState(false);
  const [hideBlanks, setHideBlanks] = React.useState(false);
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

  const gradesDesc: number[] = [];
  for (let g = scoped.hi; g >= scoped.lo; g--) gradesDesc.push(g);
  const gradesAsc = [...gradesDesc].reverse();

  const segments: Segment[] =
    granularity === "path"
      ? [
          { key: "IC", label: "Individual Contributor", path: "IC", bands: bandsForPath("IC").map((b) => b.key) },
          { key: "M", label: "Management", path: "M", bands: bandsForPath("M").map((b) => b.key) },
        ]
      : BANDS.map((b) => ({ key: b.key, label: `${b.code} · ${b.name}`, path: b.path, bands: [b.key] }));

  const cellJobs = (grade: number, seg: Segment) =>
    graded.filter((j) => j.currentGrade === grade && seg.bands.includes(j.band as BandKey));

  // "Don't show blanks": drop grades/segments that have no jobs at all.
  const visSegments = hideBlanks
    ? segments.filter((seg) => gradesDesc.some((g) => cellJobs(g, seg).length > 0))
    : segments;
  const visGradesDesc = hideBlanks
    ? gradesDesc.filter((g) => segments.some((seg) => cellJobs(g, seg).length > 0))
    : gradesDesc;
  const visGradesAsc = [...visGradesDesc].reverse();

  const hasGraded = jobs.some((j) => j.currentGrade != null);

  const chip = (j: Job) => (
    <JobChip key={j.id} job={j} familyColor={familyMap[j.familyId]?.color} isDark={isDark} onClick={() => router.push(`/jobs/${j.id}`)} />
  );

  const gradeCell = (grade: number) => {
    const c = gradeColor(grade);
    return (
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-sm" style={{ background: c.solid }} />
        <span className="text-sm font-bold tnum">{grade}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade structure"
        description="Your whole job architecture at a glance — jobs by grade and band, or as a sortable table."
      />

      {!hasGraded ? (
        <EmptyState icon={Grid3x3} title="Nothing to chart yet" description="Grade some jobs and they'll appear here." />
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="matrix">Matrix</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>

            {view === "matrix" && (
              <>
                <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                  <TabsList>
                    <TabsTrigger value="path">By path</TabsTrigger>
                    <TabsTrigger value="band">By band</TabsTrigger>
                  </TabsList>
                </Tabs>
                <button
                  onClick={() => setSwap((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <ArrowLeftRight className="size-4 text-muted-foreground" /> Swap rows/columns
                </button>
                <button
                  onClick={() => setHideBlanks((b) => !b)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    hideBlanks ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <EyeOff className="size-4" /> Don&apos;t show blanks
                </button>
              </>
            )}

            <div className="flex-1" />

            <Select value={familyId} onValueChange={setFamilyId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Family" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="flagged" checked={onlyFlagged} onCheckedChange={setOnlyFlagged} />
              <Label htmlFor="flagged" className="cursor-pointer text-sm text-muted-foreground">Only flagged</Label>
            </div>
            <ExplainWithAI
              title="Grade structure"
              kind="table"
              data={() => ({
                totalGraded: graded.length,
                grades: [...new Set(graded.map((j) => j.currentGrade))].sort((a, b) => (b ?? 0) - (a ?? 0)),
                byGrade: Object.entries(
                  graded.reduce<Record<string, number>>((acc, j) => {
                    const g = String(j.currentGrade);
                    acc[g] = (acc[g] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([grade, count]) => ({ grade, count })),
                byPath: {
                  IC: graded.filter((j) => j.careerPath === "IC").length,
                  M: graded.filter((j) => j.careerPath === "M").length,
                },
                byBand: Object.entries(
                  graded.reduce<Record<string, number>>((acc, j) => {
                    const b = getBand(j.band as BandKey).name;
                    acc[b] = (acc[b] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([band, count]) => ({ band, count })),
              })}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={graded.length === 0}
              onClick={async () => {
                const { exportJobsToExcel } = await import("@/lib/export/excel");
                await exportJobsToExcel(graded, families, data?.evaluations ?? [], org.name);
              }}
            >
              <FileDown className="size-4" /> Export to Excel
            </Button>
          </div>

          {view === "table" ? (
            <StructureTable jobs={graded} families={families} />
          ) : !swap ? (
            // Grades as rows, segments as columns
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <div className="min-w-[640px]">
                <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: `72px repeat(${visSegments.length}, minmax(130px, 1fr))` }}>
                  <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Grade</div>
                  {visSegments.map((seg) => (
                    <div key={seg.key} className={cn("border-l border-border px-3 py-2.5 text-xs font-semibold", seg.path === "M" ? "text-primary" : "text-info")}>
                      {seg.label}
                    </div>
                  ))}
                </div>
                {visGradesDesc.map((grade) => (
                  <div key={grade} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: `72px repeat(${visSegments.length}, minmax(130px, 1fr))` }}>
                    <div className="flex items-center px-3 py-2">{gradeCell(grade)}</div>
                    {visSegments.map((seg) => (
                      <div key={seg.key} className="border-l border-border p-1.5">
                        <div className="flex flex-wrap gap-1">{cellJobs(grade, seg).map(chip)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Segments as rows, grades as columns
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <div style={{ minWidth: 160 + visGradesAsc.length * 88 }}>
                <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: `160px repeat(${visGradesAsc.length}, minmax(84px, 1fr))` }}>
                  <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Band / Path</div>
                  {visGradesAsc.map((g) => (
                    <div key={g} className="border-l border-border px-2 py-2.5">{gradeCell(g)}</div>
                  ))}
                </div>
                {visSegments.map((seg) => (
                  <div key={seg.key} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: `160px repeat(${visGradesAsc.length}, minmax(84px, 1fr))` }}>
                    <div className={cn("flex items-center px-3 py-2 text-xs font-semibold", seg.path === "M" ? "text-primary" : "text-info")}>{seg.label}</div>
                    {visGradesAsc.map((g) => (
                      <div key={g} className="border-l border-border p-1.5">
                        <div className="flex flex-wrap gap-1">{cellJobs(g, seg).map(chip)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

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

function JobChip({ job, familyColor, isDark, onClick }: { job: Job; familyColor?: string; isDark: boolean; onClick: () => void }) {
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
          <p className="text-muted-foreground">{getBand(job.band as BandKey).name} · Grade {grade}</p>
          {job.confidence && <p className="text-muted-foreground capitalize">{job.confidence} confidence</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
