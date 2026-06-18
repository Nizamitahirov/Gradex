"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Lightbulb } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { useSaveEvaluation } from "@/hooks/use-mutations";
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
import { JDAssistant } from "@/components/ai/jd-assistant";
import { cn } from "@/lib/utils";
import {
  FACTORS,
  BANDS,
  bandGradeWindow,
  candidateWindow,
  getBand,
  gradeJob,
  suggestBand,
  BANDING_QUESTIONS,
  type BandKey,
  type BandingAnswers,
  type FactorSelections,
} from "@/lib/grading";

const STEP_LABELS = ["Banding", ...FACTORS.map((_, i) => `Factor ${i + 1}`), "Review"];

// Ordered banding questions reachable given current answers (follows the tree).
function reachableQuestions(a: BandingAnswers): (keyof BandingAnswers)[] {
  const q: (keyof BandingAnswers)[] = ["managingPeopleFocus"];
  if (a.managingPeopleFocus) {
    q.push("manageProfessionalsOrManagers");
    if (a.manageProfessionalsOrManagers) {
      q.push("setFunctionalStrategy");
      if (a.setFunctionalStrategy) {
        q.push("setBusinessStrategy");
        if (a.setBusinessStrategy) q.push("isCeo");
      }
    }
  } else {
    q.push("specificFunctionalKnowledge");
    if (a.specificFunctionalKnowledge) {
      q.push("independentProfessionalExpertise");
      if (a.independentProfessionalExpertise) q.push("subjectMatterExpert");
    }
  }
  return q;
}

interface DraftState {
  answers: BandingAnswers;
  band: BandKey;
  bandTouched: boolean;
  selections: FactorSelections;
  note: string;
  jobPurpose: string;
  jd: string;
  step: number;
}

export default function GradeWizardPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { data } = useOrgData();
  const org = data?.org;
  const job = data?.jobs.find((j) => j.id === jobId);
  const saveEvaluation = useSaveEvaluation();

  const draftKey = `gradex-draft-${jobId}`;
  const [hydrated, setHydrated] = React.useState(false);
  const [d, setD] = React.useState<DraftState>({
    answers: { managingPeopleFocus: false },
    band: (job?.band as BandKey) ?? "3IC",
    bandTouched: false,
    selections: {},
    note: "",
    jobPurpose: "",
    jd: "",
    step: 0,
  });

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

  const companyGrade = org?.scoping?.completed ? org.scoping.result.companyGrade : 25;
  const scopedLo = org?.scoping?.completed ? org.scoping.result.bottomGrade : 1;
  const scopedHi = org?.scoping?.completed ? org.scoping.result.topGrade : 25;
  const scoped = React.useMemo(() => ({ lo: scopedLo, hi: scopedHi }), [scopedLo, scopedHi]);

  const suggestion = React.useMemo(() => suggestBand(d.answers), [d.answers]);
  const effectiveBand = d.bandTouched ? d.band : suggestion.band;
  const careerPath = getBand(effectiveBand).path;

  const result = React.useMemo(
    () =>
      gradeJob({
        selections: d.selections,
        band: effectiveBand,
        careerPath,
        scopedRange: scoped,
        companyGrade,
      }),
    [d.selections, effectiveBand, careerPath, scoped, companyGrade],
  );

  const window = candidateWindow(effectiveBand, scoped, companyGrade);

  if (!org || !job) return null;

  const set = (patch: Partial<DraftState>) => setD((prev) => ({ ...prev, ...patch }));
  const setAnswer = (k: keyof BandingAnswers, v: boolean) =>
    setD((prev) => ({ ...prev, answers: { ...prev.answers, [k]: v }, bandTouched: false }));

  const totalSteps = STEP_LABELS.length;
  const factorIndex = d.step - 1;
  const isFactorStep = d.step >= 1 && d.step <= FACTORS.length;
  const isReview = d.step === totalSteps - 1;
  const answeredCount = FACTORS.filter((f) => d.selections[f.id] !== undefined).length;

  const next = () => set({ step: Math.min(totalSteps - 1, d.step + 1) });
  const back = () => set({ step: Math.max(0, d.step - 1) });

  const onSave = async () => {
    if (!result.complete || !job) {
      toast.error("Answer all seven factors before saving.");
      return;
    }
    try {
      await saveEvaluation.mutateAsync({
        jobId: job.id,
        payload: {
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
          careerPath,
          band: effectiveBand,
          jd: d.jd || undefined,
          jobPurpose: d.jobPurpose || undefined,
        },
      });
      localStorage.removeItem(draftKey);
      toast.success(`Saved — ${job.title} is grade ${result.finalGrade}.`);
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const questions = reachableQuestions(d.answers);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push(`/jobs/${job.id}`)}>
        <ArrowLeft className="size-4" /> {job.title}
      </Button>
      <PageHeader title={`Grade: ${job.title}`} description="Band the job with the GGS decision tree, then evaluate it against the seven factors." />
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
                {/* Banding step */}
                {d.step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">Banding — decision tree</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Answer the questions to place the job in a GGS band. You can override the result below.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {questions.map((key) => {
                        const meta = BANDING_QUESTIONS[key as keyof typeof BANDING_QUESTIONS];
                        const val = d.answers[key];
                        return (
                          <div key={key} className="rounded-xl border border-border p-3">
                            <p className="text-sm font-medium">{meta.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{meta.objective}</p>
                            <div className="mt-2 flex gap-2">
                              {[true, false].map((opt) => (
                                <button
                                  key={String(opt)}
                                  onClick={() => setAnswer(key, opt)}
                                  className={cn(
                                    "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
                                    val === opt ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent",
                                  )}
                                >
                                  {opt ? "Yes" : "No"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Lightbulb className="size-4" /> Suggested band: {getBand(suggestion.band).code} — {getBand(suggestion.band).name}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{suggestion.reasoning}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Band (override if needed)</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {BANDS.map((b) => {
                          const w = bandGradeWindow(b.key, companyGrade);
                          const active = effectiveBand === b.key;
                          return (
                            <button
                              key={b.key}
                              onClick={() => set({ band: b.key, bandTouched: true })}
                              className={cn(
                                "rounded-lg border p-3 text-left transition-colors",
                                active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{b.code} · {b.name}</span>
                                <Badge variant="outline" className="tnum">{w.lo === w.hi ? w.lo : `${w.lo}–${w.hi}`}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>
                            </button>
                          );
                        })}
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
                        onValueChange={(v) => set({ selections: { ...d.selections, [factor.id]: Number(v) } })}
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
                                  <Badge variant={active ? "default" : "secondary"} className="tnum">L{lv.index + 1}</Badge>
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
                      <p className="mt-1 text-sm text-muted-foreground">How this grade was produced. Add a rationale note for the audit trail.</p>
                    </div>
                    {result.complete ? (
                      <GradeExplainer result={result} band={effectiveBand} />
                    ) : (
                      <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
                        You still have {FACTORS.length - answeredCount} factor{FACTORS.length - answeredCount > 1 ? "s" : ""} to answer.
                      </div>
                    )}
                    <JDAssistant
                      context={{
                        title: job.title,
                        family: data?.families.find((f) => f.id === job.familyId)?.name,
                        band: `${getBand(effectiveBand).code} ${getBand(effectiveBand).name}`,
                        careerPath: careerPath === "M" ? "Management" : "Individual Contributor",
                        factorSummary: result.breakdown
                          .filter((b) => b.levelIndex >= 0)
                          .map((b) => `${b.name}: ${b.levelLabel}`)
                          .join("; "),
                        company: org?.name,
                      }}
                      jobPurpose={d.jobPurpose}
                      setJobPurpose={(v) => set({ jobPurpose: v })}
                      jd={d.jd}
                      setJd={(v) => set({ jd: v })}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="note">Rationale note (optional)</Label>
                      <Textarea id="note" value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="Why this grade? Good practice for audit." />
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
                <Button onClick={next}>Next <ArrowRight className="size-4" /></Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live panel */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader><CardTitle className="text-base">Live estimate</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <GradeBadge grade={answeredCount > 0 ? result.finalGrade : null} size="xl" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated grade</p>
                <p className="text-3xl font-semibold tnum">{answeredCount > 0 ? <AnimatedNumber value={result.finalGrade} /> : "—"}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Factors answered</span>
                <span className="tnum">{answeredCount} / {FACTORS.length}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full bg-primary" animate={{ width: `${(answeredCount / FACTORS.length) * 100}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <Row label="Band" value={`${getBand(effectiveBand).code} · ${getBand(effectiveBand).name}`} />
              <Row label="Band window" value={window.lo === window.hi ? `${window.lo}` : `${window.lo}–${window.hi}`} />
              <Row label="Path" value={careerPath === "M" ? "Management" : "Individual Contributor"} />
              <Row label="Company grade" value={String(companyGrade)} />
            </div>
            {d.step >= 1 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Selected levels</p>
                {result.breakdown.filter((b) => b.levelIndex >= 0).map((b) => (
                  <div key={b.id} className="flex justify-between text-xs">
                    <span className="truncate text-muted-foreground">{b.name}</span>
                    <span className="tnum">L{b.levelIndex + 1}</span>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}
