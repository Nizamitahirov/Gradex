"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  FolderTree,
  Gauge,
  AlertTriangle,
  Target,
  ArrowRight,
  Plus,
  Grid3x3,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import {
  GradeDistributionChart,
  BandDistributionChart,
  PathSplitDonut,
} from "@/components/charts/distribution-charts";
import { getBand } from "@/lib/grading/bands";
import { formatTimeAgo } from "@/lib/time";

export default function DashboardPage() {
  const org = useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
  const jobs = useAppStore((s) => s.jobs);
  const families = useAppStore((s) => s.families);
  const activity = useAppStore((s) => s.activity);

  if (!org) return null;

  const scoped = org.scoping?.completed
    ? { lo: org.scoping.result.bottomGrade, hi: org.scoping.result.topGrade }
    : { lo: 1, hi: 25 };

  const graded = jobs.filter((j) => j.currentGrade != null);
  const flagged = jobs.filter((j) => j.status === "needs_review" || j.flags.length > 0);
  const avgGrade =
    graded.length > 0
      ? Math.round((graded.reduce((s, j) => s + (j.currentGrade ?? 0), 0) / graded.length) * 10) / 10
      : 0;
  const pctGraded = jobs.length ? Math.round((graded.length / jobs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Overview of ${org.name}'s job architecture.`}
        action={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4" /> Add job
            </Link>
          </Button>
        }
      />

      {!org.scoping?.completed && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Target className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">Complete scoping to get started</h3>
                <p className="text-sm text-muted-foreground">
                  Size your organization so grades are calibrated. Grading is gated until scoping is done.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/scoping">
                Start scoping <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total jobs" value={jobs.length} icon={Briefcase} hint={`${pctGraded}% graded`} />
        <StatCard label="Families" value={families.length} icon={FolderTree} />
        <StatCard label="Average grade" value={avgGrade || "—"} icon={Gauge} hint={`Range ${scoped.lo}–${scoped.hi}`} />
        <StatCard
          label="Need review"
          value={flagged.length}
          icon={AlertTriangle}
          hint={flagged.length ? "Flagged anomalies" : "All clear"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Grade distribution</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/structure">
                <Grid3x3 className="size-4" /> Structure
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {graded.length ? (
              <GradeDistributionChart jobs={graded} range={scoped} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No graded jobs yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career path split</CardTitle>
          </CardHeader>
          <CardContent>
            <PathSplitDonut jobs={jobs} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Jobs by band</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length ? (
              <BandDistributionChart jobs={jobs} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No jobs yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate">{a.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actorName} · {formatTimeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {flagged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> Anomalies to review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagged.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <GradeBadge grade={j.currentGrade} size="sm" />
                <span className="flex-1 truncate font-medium">{j.title}</span>
                <Badge variant="outline">{getBand(j.band as never).name}</Badge>
                <ConfidenceBadge confidence={j.confidence} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
