"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { useAuth } from "@/contexts/auth-context";
import { useSaveScoping } from "@/hooks/use-mutations";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { PdfReference } from "@/components/grading/pdf-reference";
import { SCOPING_REFERENCES } from "@/lib/grading/references";
import { ScaleVisual } from "@/components/scale-visual";
import { AnimatedNumber } from "@/components/animated-number";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  computeScoping,
  DIVERSITY_COMPLEXITY_OPTIONS,
  GEOGRAPHIC_BREADTH_OPTIONS,
  type DiversityComplexity,
  type GeographicBreadth,
} from "@/lib/scoping";

const STEPS = ["Revenue", "Employees", "Complexity & reach", "Result"];

export default function ScopingPage() {
  const router = useRouter();
  const { data } = useOrgData();
  const { can } = useAuth();
  const canEdit = can("scoping", "edit");
  const org = data?.org;
  const saveScoping = useSaveScoping();

  const existing = org?.scoping?.inputs;
  const [step, setStep] = React.useState(0);
  const [revenueMillions, setRevenueMillions] = React.useState(existing?.revenueMillions ?? 3000);
  const [fteEmployees, setFteEmployees] = React.useState(existing?.fteEmployees ?? 8000);
  const [geographicBreadth, setGeographicBreadth] = React.useState<GeographicBreadth>(existing?.geographicBreadth ?? "international");
  const [diversityComplexity, setDiversityComplexity] = React.useState<DiversityComplexity>(existing?.diversityComplexity ?? "medium");
  const [industry, setIndustry] = React.useState(existing?.industry ?? org?.industry ?? "Technology");

  const inputs = { revenueMillions, currency: "USD", fteEmployees, geographicBreadth, diversityComplexity, industry };
  const result = React.useMemo(
    () => computeScoping(inputs),
    [revenueMillions, fteEmployees, geographicBreadth, diversityComplexity, industry],
  );

  if (!org) return null;

  const onSave = async () => {
    try {
      await saveScoping.mutateAsync({ inputs, result });
      toast.success(`Scoping saved — Company Grade ${result.companyGrade}. Grading is unlocked.`);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scoping");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoping — Business Analysis"
        description="Size the organization to set the Company (CEO) Grade. The GGS Scope Data Matrix averages Revenue, FTE and Diversity/Complexity × Geographic Breadth."
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
                    <Intro title="Annual revenue" body="Latest reported annual revenue, in millions of USD. Revenue is a key driver of business size." />
                    <div className="space-y-2">
                      <Label htmlFor="rev">Annual revenue (millions USD)</Label>
                      <Input id="rev" type="number" min={0} value={revenueMillions} onChange={(e) => setRevenueMillions(Number(e.target.value))} className="tnum" />
                      <p className="text-xs text-muted-foreground">
                        Revenue Scope Grade: <span className="font-medium tnum">{result.revenueGrade}</span>
                      </p>
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <Intro title="FTE employees" body="Full-time-equivalent number of employees currently employed by the business." />
                    <div className="space-y-2">
                      <Label htmlFor="fte">FTE employees</Label>
                      <Input id="fte" type="number" min={0} value={fteEmployees} onChange={(e) => setFteEmployees(Number(e.target.value))} className="tnum" />
                      <p className="text-xs text-muted-foreground">
                        FTE Scope Grade: <span className="font-medium tnum">{result.fteGrade}</span>
                      </p>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <Intro title="Diversity/Complexity & Geographic Breadth" body="These two qualitative dimensions combine into one Scope Grade." />
                    <div className="space-y-2">
                      <Label>Business Diversity / Complexity</Label>
                      <Select value={diversityComplexity} onValueChange={(v) => setDiversityComplexity(v as DiversityComplexity)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIVERSITY_COMPLEXITY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label} — {o.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Geographic Breadth</Label>
                      <Select value={geographicBreadth} onValueChange={(v) => setGeographicBreadth(v as GeographicBreadth)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GEOGRAPHIC_BREADTH_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label} — {o.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Combined Scope Grade: <span className="font-medium tnum">{result.dcGeoGrade}</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ind">Industry (informational)</Label>
                      <Input id="ind" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                    </div>
                  </>
                )}
                {step === 3 && (
                  <div className="space-y-5">
                    <Intro title="Company Grade" body="The average of the three Scope Grades sets the CEO grade and the ceiling for all jobs." />
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Sparkles className="size-4" /> Recommendation
                      </div>
                      <p className="mt-2 text-lg">
                        Company Grade <strong className="tnum">{result.companyGrade}</strong> — a{" "}
                        <strong className="capitalize">{result.businessSize}</strong> business unit. The CEO sits at grade{" "}
                        <strong className="tnum">{result.companyGrade}</strong>; jobs span grades 1–{result.topGrade}.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat label="Revenue" value={result.revenueGrade} />
                      <Stat label="FTE" value={result.fteGrade} />
                      <Stat label="Complexity × Geo" value={result.dcGeoGrade} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((x) => x + 1)}>Next <ArrowRight className="size-4" /></Button>
              ) : (
                <Button onClick={onSave} disabled={!canEdit || saveScoping.isPending} title={canEdit ? undefined : "You don't have permission to edit scoping"}>
                  <Check className="size-4" /> Save scoping
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader><CardTitle className="text-base">Live preview</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-baseline gap-2">
              <AnimatedNumber value={result.companyGrade} className="text-4xl font-extrabold tnum" />
              <span className="text-sm text-muted-foreground">Company Grade</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Bottom" value={result.bottomGrade} />
              <Mini label="Top" value={result.topGrade} />
              <Mini label="CEO" value={result.ceoGrade} />
            </div>
            <ScaleVisual bottom={result.bottomGrade} top={result.topGrade} ceo={result.ceoGrade} />
            <p className="text-xs text-muted-foreground capitalize">
              Business size: <span className="font-medium">{result.businessSize}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Intro({ title, body }: { title: string; body: string }) {
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
