"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gauge, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { GradeExplainer } from "@/components/grade-explainer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBand, type BandKey } from "@/lib/grading/bands";
import type { GradingResult } from "@/lib/grading/engine";
import { formatDate, formatTimeAgo } from "@/lib/time";
import type { Evaluation } from "@/types";

function toResult(e: Evaluation): GradingResult {
  return {
    breakdown: e.breakdown as GradingResult["breakdown"],
    factorScores: e.factorScores as GradingResult["factorScores"],
    rawScore: e.rawScore,
    rMax: e.rMax,
    computedGrade: e.computedGrade,
    finalGrade: e.finalGrade,
    bandWindow: e.bandWindow,
    anomaly: e.anomaly,
    confidence: e.confidence,
    flags: e.flags,
    complete: true,
  };
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const family = useAppStore((s) => s.families.find((f) => f.id === job?.familyId));
  const allEvals = useAppStore((s) => s.evaluations);
  const jobs = useAppStore((s) => s.jobs);
  const deleteJob = useAppStore((s) => s.deleteJob);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const evals = React.useMemo(
    () => allEvals.filter((e) => e.id.startsWith(`${jobId}:`) || e.id === job?.currentEvaluationId).sort((a, b) => b.gradedAt - a.gradedAt),
    [allEvals, jobId, job?.currentEvaluationId],
  );

  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        action={
          <Button onClick={() => router.push("/jobs")}>
            <ArrowLeft className="size-4" /> Back to jobs
          </Button>
        }
      />
    );
  }

  const current = evals.find((e) => e.id === job.currentEvaluationId) ?? evals[0];
  const reportsTo = jobs.find((j) => j.id === job.reportsToJobId);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push("/jobs")}>
        <ArrowLeft className="size-4" /> Jobs
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <GradeBadge grade={job.currentGrade} size="xl" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {family && (
                <Badge variant="outline">
                  <span className="size-2 rounded-full" style={{ background: family.color ?? "var(--primary)" }} />
                  {family.name}
                </Badge>
              )}
              <Badge variant="secondary">{getBand(job.band as BandKey).name}</Badge>
              <Badge variant="outline">{job.careerPath === "M" ? "Management" : "Individual Contributor"}</Badge>
              <ConfidenceBadge confidence={job.confidence} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button asChild>
            <Link href={`/jobs/${job.id}/grade`}>
              <Gauge className="size-4" /> {job.currentGrade != null ? "Re-grade" : "Grade now"}
            </Link>
          </Button>
        </div>
      </div>

      {job.description && <p className="max-w-2xl text-sm text-muted-foreground">{job.description}</p>}
      {reportsTo && (
        <p className="text-sm text-muted-foreground">
          Reports to{" "}
          <Link href={`/jobs/${reportsTo.id}`} className="font-medium text-primary hover:underline">
            {reportsTo.title}
          </Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {current ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <GradeExplainer result={toResult(current)} band={job.band as BandKey} />
                {current.note && (
                  <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Rationale</p>
                    <p className="mt-1">{current.note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Gauge}
              title="Not graded yet"
              description="Run this job through the grading wizard to compute its global grade."
              action={
                <Button asChild>
                  <Link href={`/jobs/${job.id}/grade`}>Grade now</Link>
                </Button>
              }
            />
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" /> Evaluation history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No evaluations yet.</p>
            ) : (
              <ol className="space-y-4">
                {evals.map((e, i) => (
                  <li key={e.id} className="relative flex gap-3 pl-1">
                    <div className="flex flex-col items-center">
                      <GradeBadge grade={e.finalGrade} size="sm" />
                      {i < evals.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium">
                        Grade {e.finalGrade}
                        {e.id === job.currentEvaluationId && (
                          <Badge variant="success" className="ml-2">Current</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.gradedByName ?? "Unknown"} · {formatTimeAgo(e.gradedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(e.gradedAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
            <DialogDescription>
              This permanently removes &quot;{job.title}&quot; and its evaluation history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteJob(job.id);
                toast.success("Job deleted");
                router.push("/jobs");
              }}
            >
              <Trash2 className="size-4" /> Delete job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
