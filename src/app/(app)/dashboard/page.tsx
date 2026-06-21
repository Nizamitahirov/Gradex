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
  CheckCircle2,
  TrendingUp,
  Crown,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOrgData } from "@/hooks/use-org-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { StatSparkCard } from "@/components/dashboard/stat-spark-card";
import { CompletionRing, LegendRow } from "@/components/dashboard/completion-ring";
import {
  GradeDistributionChart,
  BandDistributionChart,
  PathSplitDonut,
  FamilyComparisonChart,
  ConfidenceDonut,
} from "@/components/charts/distribution-charts";
import { formatTimeAgo } from "@/lib/time";

/** Cumulative count series from timestamps, for sparklines. */
function cumulativeSeries(timestamps: number[], buckets = 8): number[] {
  if (!timestamps.length) return new Array(buckets).fill(0);
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps, Date.now());
  const span = Math.max(1, max - min);
  const counts = new Array(buckets).fill(0);
  for (const t of timestamps) {
    let i = Math.floor(((t - min) / span) * buckets);
    if (i >= buckets) i = buckets - 1;
    if (i < 0) i = 0;
    counts[i]++;
  }
  let acc = 0;
  return counts.map((c) => (acc += c));
}

/** Per-bucket aggregate (avg or max) with carry-forward, for sparklines. */
function aggSeries(items: { t: number; v: number }[], buckets = 8, mode: "avg" | "max" = "avg"): number[] {
  if (!items.length) return new Array(buckets).fill(0);
  const min = Math.min(...items.map((i) => i.t));
  const max = Math.max(...items.map((i) => i.t), Date.now());
  const span = Math.max(1, max - min);
  const groups: number[][] = Array.from({ length: buckets }, () => []);
  for (const it of items) {
    let i = Math.floor(((it.t - min) / span) * buckets);
    if (i >= buckets) i = buckets - 1;
    if (i < 0) i = 0;
    groups[i].push(it.v);
  }
  let carry = 0;
  return groups.map((g) => {
    if (!g.length) return carry;
    carry = mode === "avg" ? g.reduce((a, b) => a + b, 0) / g.length : Math.max(...g);
    return carry;
  });
}

const HERO_PALETTE = ["#6E6CFF", "#8B5CF6", "#B57BFF", "#FF6FB0", "#16C098", "#4DABF7"];
function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = HERO_PALETTE[Math.abs(h) % HERO_PALETTE.length];
  const b = HERO_PALETTE[Math.abs(h >> 3) % HERO_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useOrgData();

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load data"
        description={error instanceof Error ? error.message : "Please try again."}
      />
    );
  }

  if (!data || !data.org) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No organization data yet"
        description="Your Firestore project has no organization. Seed it or create one to get started."
      />
    );
  }

  const { org, jobs, families, evaluations, activity } = data;

  const scoped = org.scoping?.completed
    ? { lo: org.scoping.result.bottomGrade, hi: org.scoping.result.topGrade }
    : { lo: 1, hi: 25 };

  const graded = jobs.filter((j) => j.currentGrade != null);
  const flagged = jobs.filter((j) => j.status === "needs_review" || (j.flags?.length ?? 0) > 0);
  const grades = graded.map((j) => j.currentGrade!) as number[];
  const avgGrade = grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : 0;
  const maxGrade = grades.length ? Math.max(...grades) : 0;
  const pctGraded = jobs.length ? Math.round((graded.length / jobs.length) * 100) : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayGraded = evaluations.filter((e) => e.gradedAt >= todayStart.getTime()).length;
  const weekGraded = evaluations.filter((e) => e.gradedAt >= todayStart.getTime() - 7 * 864e5).length;

  const jobsSpark = cumulativeSeries(jobs.map((j) => j.createdAt));
  const gradedSpark = cumulativeSeries(evaluations.map((e) => e.gradedAt));
  const familiesSpark = cumulativeSeries(families.map((f) => f.createdAt));
  const reviewSpark = cumulativeSeries(flagged.map((j) => j.updatedAt));
  const avgSpark = aggSeries(evaluations.map((e) => ({ t: e.gradedAt, v: e.finalGrade })), 8, "avg");
  const maxSpark = aggSeries(evaluations.map((e) => ({ t: e.gradedAt, v: e.finalGrade })), 8, "max");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user?.displayName ?? "").split(" ")[0] || "";

  const familyStats = families
    .map((f) => {
      const fjobs = jobs.filter((j) => j.familyId === f.id);
      const fg = fjobs.filter((j) => j.currentGrade != null).map((j) => j.currentGrade!) as number[];
      const avg = fg.length ? Math.round((fg.reduce((a, b) => a + b, 0) / fg.length) * 10) / 10 : 0;
      return { family: f, count: fjobs.length, avg, min: fg.length ? Math.min(...fg) : 0, max: fg.length ? Math.max(...fg) : 0 };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-glow)] sm:p-8"
        style={{ background: "linear-gradient(135deg, #5B5BF5 0%, #7C5BF7 55%, #B57BFF 100%)" }}
      >
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-white/80">
              {greeting}{firstName ? `, ${firstName}` : ""} 👋
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {todayGraded > 0 ? (
                <>
                  <span
                    style={{
                      background: "linear-gradient(90deg, #FFD466, #FF8FB1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {todayGraded}
                  </span>{" "}
                  {todayGraded === 1 ? "job graded" : "jobs graded"} today.
                </>
              ) : (
                <>{org.name} job architecture.</>
              )}
            </h1>
            <p className="mt-2 text-sm text-white/80">
              {families.length} departments · {graded.length} jobs graded
              {flagged.length > 0
                ? ` · ${flagged.length} need review.`
                : weekGraded > 0
                  ? ` · ${weekGraded} graded this week.`
                  : "."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-none">
                <Link href="/jobs/new">
                  <Plus className="size-4" /> Add job
                </Link>
              </Button>
              <Button asChild variant="secondary" className="border border-white/30 bg-white/10 text-white hover:bg-white/20 shadow-none">
                <Link href="/structure">
                  <Grid3x3 className="size-4" /> Structure
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <HeroStat icon={TrendingUp} value={`${pctGraded}%`} label="Graded" />
            <HeroStat icon={AlertTriangle} value={flagged.length} label="Need review" />
          </div>
        </div>
      </div>

      {/* Scoping CTA */}
      {!org.scoping?.completed && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Target className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Complete scoping to get started</h3>
                <p className="text-sm text-muted-foreground">Grades are calibrated to your organization&apos;s size.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/scoping">Start scoping <ArrowRight className="size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STAT SPARK CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatSparkCard icon={Briefcase} accent="indigo" label="Total jobs" value={jobs.length} points={jobsSpark} delta={`+${jobs.length}`} />
        <StatSparkCard icon={CheckCircle2} accent="pink" label="Graded" value={graded.length} total={jobs.length} points={gradedSpark} delta={`${pctGraded}%`} />
        <StatSparkCard icon={Gauge} accent="info" label="Average grade" value={avgGrade || "—"} points={avgSpark} delta={`${scoped.lo}–${scoped.hi}`} />
        <StatSparkCard icon={Crown} accent="success" label="Highest grade" value={maxGrade || "—"} points={maxSpark} delta={`CEO ${scoped.hi}`} />
        <StatSparkCard icon={FolderTree} accent="cyan" label="Departments" value={families.length} points={familiesSpark} delta={`+${families.length}`} />
        <StatSparkCard icon={AlertTriangle} accent="warn" label="Need review" value={flagged.length} total={jobs.length} points={reviewSpark} delta={flagged.length ? `${flagged.length}` : "0"} deltaDir={flagged.length ? "down" : "up"} />
      </div>

      {/* Families list + completion ring */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderTree className="size-4" />
              </span>
              Departments
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/families">View all <ArrowRight className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {familyStats.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No departments yet.</p>
            )}
            {familyStats.map(({ family, count, avg, min, max }) => (
              <Link
                key={family.id}
                href={`/families/${family.id}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent"
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white"
                  style={{ background: gradientFor(family.id) }}
                >
                  {family.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{family.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tnum">{count} jobs</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(avg / 25) * 100}%`, background: family.color ?? "var(--primary)" }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground tnum">
                      avg {avg || "—"}
                    </span>
                  </div>
                </div>
                {min > 0 && (
                  <div className="hidden items-center gap-1 sm:flex">
                    <GradeBadge grade={min} size="sm" />
                    <span className="text-xs text-muted-foreground">–</span>
                    <GradeBadge grade={max} size="sm" />
                  </div>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grading progress</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionRing percent={pctGraded} label="graded" />
            <div className="mt-4 border-t border-border pt-3">
              <LegendRow color="var(--success)" label="Graded" value={graded.length} />
              <LegendRow color="#F5A524" label="Need review" value={flagged.length} />
              <LegendRow color="var(--muted-foreground)" label="Draft" value={jobs.filter((j) => j.status === "draft").length} />
              <LegendRow color="var(--primary)" label="Total jobs" value={jobs.length} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard icon={BarChart3} title="Grade distribution">
          {graded.length ? <GradeDistributionChart jobs={graded} range={scoped} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard icon={Grid3x3} title="Jobs by band">
          {jobs.length ? <BandDistributionChart jobs={jobs} /> : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard icon={Users} title="Career path (IC / M)">
          <PathSplitDonut jobs={jobs} />
        </ChartCard>
        <ChartCard icon={Gauge} title="Confidence level">
          <ConfidenceDonut jobs={graded} />
        </ChartCard>
        <ChartCard icon={FolderTree} title="Average grade by department">
          {graded.length ? <FamilyComparisonChart jobs={jobs} families={families} /> : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Activity + anomalies */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-success/12 text-success">
                <TrendingUp className="size-4" />
              </span>
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-white"
                  style={{ background: gradientFor(a.actorId || a.id) }}
                >
                  {(a.actorName || "U").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{a.summary}</p>
                  <p className="text-xs text-muted-foreground">{a.actorName} · {formatTimeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> Needs review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagged.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No anomalies 🎉</p>
            )}
            {flagged.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <GradeBadge grade={j.currentGrade} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{j.title}</span>
                <ConfidenceBadge confidence={j.confidence} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: typeof TrendingUp; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex size-9 items-center justify-center rounded-lg bg-white/20">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl font-extrabold tnum">{value}</div>
        <div className="text-[11px] text-white/80">{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ icon: Icon, title, children }: { icon: typeof BarChart3; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
