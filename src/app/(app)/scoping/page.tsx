"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { ScaleVisual } from "@/components/scale-visual";
import { AnimatedNumber } from "@/components/animated-number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  computeScoping,
  COMPLEXITY_OPTIONS,
  GEO_BREADTH_OPTIONS,
  type Complexity,
  type GeoBreadth,
} from "@/lib/scoping";

const STEPS = ["Revenue", "People & reach", "Complexity", "Result"];

export default function ScopingPage() {
  const router = useRouter();
  const org = useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
  const saveScoping = useAppStore((s) => s.saveScoping);

  const existing = org?.scoping?.inputs;
  const [step, setStep] = React.useState(0);
  const [revenue, setRevenue] = React.useState(existing?.revenue ?? 3_000_000_000);
  const [currency, setCurrency] = React.useState(existing?.currency ?? org?.currency ?? "USD");
  const [headcount, setHeadcount] = React.useState(existing?.headcount ?? 8_000);
  const [geoBreadth, setGeoBreadth] = React.useState<GeoBreadth>(existing?.geoBreadth ?? "national");
  const [complexity, setComplexity] = React.useState<Complexity>(existing?.complexity ?? "multiple");
  const [industry, setIndustry] = React.useState(existing?.industry ?? org?.industry ?? "Technology");

  const inputs = { revenue, currency, headcount, geoBreadth, complexity, industry };
  const result = React.useMemo(() => computeScoping(inputs), [revenue, currency, headcount, geoBreadth, complexity, industry]);

  if (!org) return null;

  const onSave = () => {
    saveScoping(org.id, inputs, result);
    toast.success("Scoping saved — grading is now unlocked.");
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoping"
        description="Size your organization so grades are calibrated to its scale. Recomputes live as you answer."
      />
      <WizardProgress steps={STEPS} current={step} onStepClick={setStep} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-5"
              >
                {step === 0 && (
                  <>
                    <StepIntro
                      title="Annual revenue"
                      body="Revenue is one of the strongest signals of organizational size. Enter your total annual revenue."
                    />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="revenue">Annual revenue</Label>
                        <Input
                          id="revenue"
                          type="number"
                          min={0}
                          value={revenue}
                          onChange={(e) => setRevenue(Number(e.target.value))}
                          className="tnum"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["USD", "EUR", "GBP", "AZN", "JPY"].map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <StepIntro
                      title="People & geographic reach"
                      body="Headcount and how widely you operate both scale the structure."
                    />
                    <div className="space-y-2">
                      <Label htmlFor="headcount">Total headcount</Label>
                      <Input
                        id="headcount"
                        type="number"
                        min={0}
                        value={headcount}
                        onChange={(e) => setHeadcount(Number(e.target.value))}
                        className="tnum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Geographic breadth</Label>
                      <Select value={geoBreadth} onValueChange={(v) => setGeoBreadth(v as GeoBreadth)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GEO_BREADTH_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <StepIntro
                      title="Business complexity"
                      body="A diversified conglomerate needs more grades than a single-product business."
                    />
                    <div className="space-y-2">
                      <Label>Business complexity</Label>
                      <Select value={complexity} onValueChange={(v) => setComplexity(v as Complexity)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLEXITY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry (informational)</Label>
                      <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <StepIntro
                      title="Recommended structure"
                      body="Based on your inputs, here is the grade range Gradex recommends."
                    />
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Sparkles className="size-4" /> Recommendation
                      </div>
                      <p className="mt-2 text-lg">
                        A{" "}
                        <strong className="tnum">{result.usedGrades.length}-grade</strong> structure,
                        grades <strong className="tnum">{result.bottomGrade}–{result.topGrade}</strong>,
                        with the CEO at grade <strong className="tnum">{result.topGrade}</strong>.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Stat label="Revenue pts" value={result.breakdown.revenuePoints} />
                      <Stat label="Headcount pts" value={result.breakdown.headcountPoints} />
                      <Stat label="Geography pts" value={result.breakdown.geoPoints} />
                      <Stat label="Complexity pts" value={result.breakdown.complexityPoints} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={onSave}>
                  <Check className="size-4" /> Save scoping
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-baseline gap-2">
              <AnimatedNumber value={result.usedGrades.length} className="text-4xl font-semibold tnum" />
              <span className="text-sm text-muted-foreground">grades used</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Bottom" value={result.bottomGrade} />
              <Mini label="Top" value={result.topGrade} />
              <Mini label="CEO" value={result.ceoGrade} />
            </div>
            <ScaleVisual bottom={result.bottomGrade} top={result.topGrade} ceo={result.ceoGrade} />
            <p className="text-xs text-muted-foreground">
              Total size score: <span className="font-medium tnum">{result.breakdown.total}</span> / 18
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepIntro({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3 text-center">
      <div className="text-2xl font-semibold tnum">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="text-xl font-semibold tnum">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
