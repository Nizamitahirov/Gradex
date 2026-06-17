"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Lightbulb, User, Users } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { AnimatedNumber } from "@/components/animated-number";
import { GradeBadge } from "@/components/grade-badge";
import { GradeExplainer } from "@/components/grade-explainer";
import { cn } from "@/lib/utils";
import {
  FACTORS,
  bandsForPath,
  candidateWindow,
  getBand,
  gradeJob,
  suggestBand,
  type BandKey,
  type CareerPath,
  type ContributionType,
  type FactorSelections,
} from "@/lib/grading";

const STEP_LABELS = ["Banding", ...FACTORS.map((_, i) => `Factor ${i + 1}`), "Review"];

interface DraftState {
  careerPath: CareerPath;
  managesPeople: boolean;
  managementLayers: 0 | 1 | 2 | 3;
  contribution: ContributionType;
  band: BandKey;
  selections: FactorSelections;
  note: string;
  step: number;
}

export default function GradeWizardPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const org = useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const jobs = useAppStore((s) => s.jobs);
  const saveEvaluation = useAppStore((s) => s.saveEvaluation);

  const draftKey = `gradex-draft-${jobId}`;
  const [hydrated, setHydrated] = React.useState(false);
  const [d, setD] = React.useState<DraftState>({
    careerPath: job?.careerPath ?? "IC",
    managesPeople: false,
    managementLayers: 0,
    contribution: "expertise",
    band: (job?.band as BandKey) ?? "professional",
    selections: {},
    note: "",
    step: 0,
  });

  // Autosave draft (no data loss on refresh) — SPEC.md §14.
  React.useEffect(() => {
    const stored = localStorage.getItem(draftKey);
    if (stored) {
      try {
        setD((prev) => ({ ...prev, ...JSON.parse(stored) }));
      } catch {}
    }
    setHydrated(true);
  }, [draftKey]);

  React.useEffect(() => {
    if (hydrated) localStorage.setItem(draftKey, JSON.stringify(d));
  }, [d, draftKey, hydrated]);

  const scopedLo = org?.scoping?.completed ? org.scoping.result.bottomGrade : 1;
  const scopedHi = org?.scoping?.completed ? org.scoping.result.topGrade : 25;
  const scoped = React.useMemo(() => ({ lo: scopedLo, hi: scopedHi }), [scopedLo, scopedHi]);

  const reportsToLeadership = React.useMemo(() => {
    if (!job?.reportsToJobId) return undefined;
    const parent = jobs.find((j) => j.id === job.reportsToJobId);
    // best-effort: not stored separately; skip unless we had it
    return parent ? undefined : undefined;
  }, [job, jobs]);

  const result = React.useMemo(
    () =>
      gradeJob(
        { selections: d.selections, band: d.band, careerPath: d.careerPath, scopedRange: scoped },
        reportsToLeadership,
      ),
    [d.selections, d.band, d.careerPath, scoped, reportsToLeadership],
  );

  const suggestion = React.useMemo(
    () =>
      suggestBand({
        careerPath: d.careerPath,
        managesPeople: d.managesPeople,
        managementLayers: d.managementLayers,
        contribution: d.contribution,
      }),
    [d.careerPath, d.managesPeople, d.managementLayers, d.contribution],
  );

  const window = candidateWindow(d.band, scoped);

  if (!org || !job) return null;

  const set = (patch: Partial<DraftState>) => setD((prev) => ({ ...prev, ...patch }));
  const totalSteps = STEP_LABELS.length;
  const factorIndex = d.step - 1; // step 1..7 maps to factor 0..6
  const isFactorStep = d.step >= 1 && d.step <= FACTORS.length;
  const isReview = d.step === totalSteps - 1;

  const answeredCount = FACTORS.filter((f) => d.selections[f.id] !== undefined).length;

  const next = () => set({ step: Math.min(totalSteps - 1, d.step + 1) });
  const back = () => set({ step: Math.max(0, d.step - 1) });

  const onSave = () => {
    if (!result.complete) {
      toast.error("Answer all seven factors before saving.");
      return;
    }
    saveEvaluation(
      job.id,
      {
        factorSelections: d.selections as Record<string, number>,
        factorScores: result.factorScores,
        rawScore: result.rawScore,
        rMax: result.rMax,
        computedGrade: result.computedGrade,
        finalGrade: result.finalGrade,
        bandWindow: result.bandWindow,
        anomaly: result.anomaly,
        flags: result.flags,
        confidence: result.confidence,
        breakdown: result.breakdown,
        note: d.note || undefined,
      },
      {
        careerPath: d.careerPath,
        band: d.band,
        currentGrade: result.finalGrade,
        confidence: result.confidence,
        flags: result.flags,
        status: result.anomaly ? "needs_review" : "graded",
      },
    );
    localStorage.removeItem(draftKey);
    toast.success(`Saved — ${job.title} is grade ${result.finalGrade}.`);
    router.push(`/jobs/${job.id}`);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push(`/jobs/${job.id}`)}>
        <ArrowLeft className="size-4" /> {job.title}
      </Button>
      <PageHeader title={`Grade: ${job.title}`} description="Band the job, then evaluate it against the seven factors." />
      <WizardProgress steps={STEP_LABELS} current={d.step} onStepClick={(i) => set({ step: i })} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={d.step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Step 1: Banding */}
                {d.step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold">Career path & banding</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Establish the kind of job and its broad altitude. This narrows the grade range
                        before detailed grading.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <PathCard
                        active={d.careerPath === "IC"}
                        icon={User}
                        title="Individual Contributor"
                        body="Delivers through personal expertise; no people-management duties."
                        onClick={() => set({ careerPath: "IC", managesPeople: false })}
                      />
                      <PathCard
                        active={d.careerPath === "M"}
                        icon={Users}
                        title="Management"
                        body="Accountable for results through other people."
                        onClick={() => set({ careerPath: "M", managesPeople: true })}
                      />
                    </div>

                    {d.careerPath === "M" ? (
                      <div className="space-y-2">
                        <Label>How many layers does this job manage?</Label>
                        <RadioCards
                          value={String(d.managementLayers)}
                          onValueChange={(v) => set({ managementLayers: Number(v) as 0 | 1 | 2 | 3 })}
                          options={[
                            { value: "1", label: "A team of ICs" },
                            { value: "2", label: "A team or function" },
                            { value: "3", label: "Other managers / a function" },
                          ]}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Primary nature of contribution</Label>
                        <RadioCards
                          value={d.contribution}
                          onValueChange={(v) => set({ contribution: v as ContributionType })}
                          options={[
                            { value: "tasks", label: "Performs defined tasks" },
                            { value: "expertise", label: "Applies professional expertise" },
                            { value: "leading", label: "Deep authority / advances the field" },
                          ]}
                        />
                      </div>
                    )}

                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Lightbulb className="size-4" /> Suggested band: {getBand(suggestion.band).name}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{suggestion.reasoning}</p>
                      {d.band !== suggestion.band && (
                        <Button size="sm" variant="secondary" className="mt-3" onClick={() => set({ band: suggestion.band })}>
                          Use suggested band
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Band (override if needed)</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {bandsForPath(d.careerPath).map((b) => (
                          <button
                            key={b.key}
                            onClick={() => set({ band: b.key })}
                            className={cn(
                              "rounded-lg border p-3 text-left transition-colors",
                              d.band === b.key ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{b.name}</span>
                              <Badge variant="outline" className="tnum">
                                {b.range.lo}–{b.range.hi}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Factor steps */}
                {isFactorStep && (() => {
                  const factor = FACTORS[factorIndex];
                  const selected = d.selections[factor.id];
                  return (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Factor {factorIndex + 1} of {FACTORS.length}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold">{factor.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{factor.why}</p>
                      </div>
                      <RadioGroup
                        value={selected !== undefined ? String(selected) : undefined}
                        onValueChange={(v) =>
                          set({ selections: { ...d.selections, [factor.id]: Number(v) } })
                        }
                        className="gap-2"
                      >
                        {factor.levels.map((lv) => {
                          const active = selected === lv.index;
                          return (
                            <Label
                              key={lv.index}
                              htmlFor={`${factor.id}-${lv.index}`}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                                active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                              )}
                            >
                              <RadioGroupItem id={`${factor.id}-${lv.index}`} value={String(lv.index)} className="mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{lv.label}</span>
                                  <Badge variant={active ? "default" : "secondary"} className="tnum">
                                    +{lv.score}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">{lv.description}</p>
                              </div>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  );
                })()}

                {/* Review */}
                {isReview && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">Review & confirm</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Here&apos;s how this grade was produced. Add a rationale note for the audit trail.
                      </p>
                    </div>
                    {result.complete ? (
                      <GradeExplainer result={result} band={d.band} />
                    ) : (
                      <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
                        You still have {FACTORS.length - answeredCount} factor
                        {FACTORS.length - answeredCount > 1 ? "s" : ""} to answer.
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="note">Rationale note (optional)</Label>
                      <Textarea
                        id="note"
                        value={d.note}
                        onChange={(e) => set({ note: e.target.value })}
                        placeholder="Why this grade? Good practice for audit."
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={back} disabled={d.step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {isReview ? (
                <Button onClick={onSave} disabled={!result.complete}>
                  <Check className="size-4" /> Save grade
                </Button>
              ) : (
                <Button onClick={next}>
                  Next <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live side panel */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Live estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <GradeBadge grade={answeredCount > 0 ? result.finalGrade : null} size="xl" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated grade</p>
                <p className="text-3xl font-semibold tnum">
                  {answeredCount > 0 ? <AnimatedNumber value={result.finalGrade} /> : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Factors answered</span>
                <span className="tnum">{answeredCount} / {FACTORS.length}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${(answeredCount / FACTORS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Raw score</span>
                <span className="font-medium tnum">{result.rawScore} / {result.rMax}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Band window</span>
                <span className="font-medium tnum">{window.lo}–{window.hi}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Band</span>
                <span className="font-medium">{getBand(d.band).name}</span>
              </div>
            </div>

            {d.step >= 1 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Contributions so far</p>
                {result.breakdown
                  .filter((b) => b.levelIndex >= 0)
                  .map((b) => (
                    <div key={b.id} className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground">{b.name}</span>
                      <span className="tnum">+{b.score}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PathCard({
  active,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <Icon className="size-4" />
      </div>
      <span className="font-medium">{title}</span>
      <span className="text-sm text-muted-foreground">{body}</span>
    </button>
  );
}

function RadioCards({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange} className="gap-2">
      {options.map((o) => (
        <Label
          key={o.value}
          htmlFor={`rc-${o.value}`}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
            value === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
          )}
        >
          <RadioGroupItem id={`rc-${o.value}`} value={o.value} />
          <span>{o.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}
