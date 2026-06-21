"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UploadCloud, Sparkles, Loader2, Eye, FileText, Trash2, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/grade-badge";
import { JDViewer } from "@/components/jd-viewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FACTORS,
  BANDS,
  getBand,
  gradeJob,
  type BandKey,
  type FactorSelections,
} from "@/lib/grading";

interface Row {
  filename: string;
  title: string;
  family: string;
  jobPurpose: string;
  jd: string;
  band: BandKey;
  factors: Record<string, number>;
  reasoning: string;
  error?: string;
}

export default function BulkGradingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [stage, setStage] = React.useState<"upload" | "review">("upload");
  const [busy, setBusy] = React.useState(false);
  const [parsed, setParsed] = React.useState<{ filename: string; text: string }[]>([]);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [ctx, setCtx] = React.useState({ companyGrade: 21, scoped: { lo: 1, hi: 21 } });
  const [viewer, setViewer] = React.useState<{ title: string; jd: string } | null>(null);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: { filename: string; text: string }[] = [...parsed];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse", { method: "POST", body: fd });
        const json = await res.json();
        if (json.success && json.text?.trim()) out.push({ filename: file.name, text: json.text });
        else toast.error(`${file.name}: ${json.error || "could not read"}`);
      } catch {
        toast.error(`${file.name}: parse failed`);
      }
    }
    setParsed(out);
    setBusy(false);
  };

  const analyze = async () => {
    if (!parsed.length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: parsed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCtx({ companyGrade: json.companyGrade, scoped: json.scopedRange });
      setRows(
        json.proposals.map((p: Row) => ({
          filename: p.filename,
          title: p.title ?? p.filename,
          family: p.family ?? "General",
          jobPurpose: p.jobPurpose ?? "",
          jd: p.jd ?? "",
          band: (p.band as BandKey) ?? "3IC",
          factors: p.factors ?? {},
          reasoning: p.reasoning ?? "",
          error: p.error,
        })),
      );
      setStage("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setBusy(false);
    }
  };

  const computeRow = (r: Row) =>
    gradeJob({
      selections: r.factors as FactorSelections,
      band: r.band,
      careerPath: getBand(r.band).path,
      scopedRange: ctx.scoped,
      companyGrade: ctx.companyGrade,
    });

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const rewriteJd = async (i: number) => {
    const r = rows[i];
    const summary = FACTORS.map((f) => `${f.name}: ${f.levels[r.factors[f.id] ?? 0]?.label ?? "?"}`).join("; ");
    update(i, { jd: r.jd + "" }); // no-op to keep ref
    toast.message("Rewriting JD with AI…");
    try {
      const res = await fetch("/api/ai/jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "rewrite", currentJD: r.jd, changeSummary: `Band ${getBand(r.band).name}. Factors — ${summary}` }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      update(i, { jd: json.jd });
      toast.success(`Rewrote JD for ${r.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    }
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      const payload = rows
        .filter((r) => !r.error)
        .map((r) => {
          const res = computeRow(r);
          return {
            title: r.title,
            family: r.family,
            jobPurpose: r.jobPurpose,
            jd: r.jd,
            band: r.band,
            careerPath: getBand(r.band).path,
            finalGrade: res.finalGrade,
            computedGrade: res.computedGrade,
            factorSelections: r.factors,
            factorScores: res.factorScores,
            rawScore: res.rawScore,
            rMax: res.rMax,
            bandWindow: res.bandWindow,
            confidence: res.confidence,
            anomaly: res.anomaly,
            flags: res.flags,
            breakdown: res.breakdown,
          };
        });
      const res = await fetch("/api/ai/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await qc.invalidateQueries({ queryKey: ["org-data"] });
      toast.success(`Saved ${json.created} jobs to the database.`);
      router.push("/jobs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push("/jobs")}>
        <ArrowLeft className="size-4" /> Jobs
      </Button>
      <PageHeader
        title="Bulk AI grading"
        description="Upload job descriptions (PDF, Word, HTML or text). The AI reads each one, creates the job, fills the seven GGS factors and grades it. Review and adjust before saving."
      />

      {stage === "upload" && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <button
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-14 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">Click to upload job descriptions</p>
                <p className="text-sm text-muted-foreground">PDF, Word (.docx), HTML or .txt — multiple files</p>
              </div>
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.html,.htm,.txt"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />

            {parsed.length > 0 && (
              <div className="space-y-2">
                {parsed.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{p.filename}</span>
                    <span className="text-xs text-muted-foreground tnum">{p.text.length} chars</span>
                    <button onClick={() => setParsed((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={analyze} disabled={busy || parsed.length === 0}>
                {busy ? <><Loader2 className="size-4 animate-spin" /> Working…</> : <><Sparkles className="size-4" /> Analyze {parsed.length || ""} with AI</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "review" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground tnum">{rows.filter((r) => !r.error).length} jobs ready</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage("upload")}>Back</Button>
              <Button onClick={saveAll} disabled={busy}>
                {busy ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Check className="size-4" /> Save all to database</>}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r, i) => {
              if (r.error) {
                return (
                  <Card key={i} className="border-destructive/30">
                    <CardContent className="flex items-center gap-3 p-4 text-sm">
                      <FileText className="size-4 text-destructive" />
                      <span className="flex-1 truncate">{r.filename}</span>
                      <Badge variant="destructive">{r.error}</Badge>
                    </CardContent>
                  </Card>
                );
              }
              const res = computeRow(r);
              return (
                <Card key={i}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <GradeBadge grade={res.finalGrade} size="lg" />
                      <div className="min-w-0 flex-1">
                        <Input value={r.title} onChange={(e) => update(i, { title: e.target.value })} className="h-8 font-medium" />
                      </div>
                      <Input value={r.family} onChange={(e) => update(i, { family: e.target.value })} className="h-8 w-36" placeholder="Department" />
                      <Select value={r.band} onValueChange={(v) => update(i, { band: v as BandKey })}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BANDS.map((b) => (
                            <SelectItem key={b.key} value={b.key}>{b.code} · {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setViewer({ title: r.title, jd: r.jd })}>
                        <Eye className="size-4" /> JD
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === i ? null : i)}>
                        Factors
                      </Button>
                    </div>

                    {r.reasoning && <p className="text-xs text-muted-foreground">{r.reasoning}</p>}

                    {expanded === i && (
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {FACTORS.map((f) => (
                            <div key={f.id} className="flex items-center gap-2">
                              <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{f.name}</span>
                              <Select
                                value={String(r.factors[f.id] ?? 0)}
                                onValueChange={(v) => update(i, { factors: { ...r.factors, [f.id]: Number(v) } })}
                              >
                                <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {f.levels.map((lv) => (
                                    <SelectItem key={lv.index} value={String(lv.index)}>L{lv.index + 1} · {lv.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button variant="secondary" size="sm" onClick={() => rewriteJd(i)}>
                            <Wand2 className="size-4" /> Rewrite JD to match
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <JDViewer open={!!viewer} onOpenChange={(v) => !v && setViewer(null)} title={viewer?.title ?? ""} jd={viewer?.jd ?? ""} />
    </div>
  );
}
