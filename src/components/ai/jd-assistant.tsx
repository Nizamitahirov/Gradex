"use client";

import * as React from "react";
import { Sparkles, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JDViewer } from "@/components/jd-viewer";

export function JDAssistant({
  context,
  jobPurpose,
  setJobPurpose,
  jd,
  setJd,
}: {
  context: { title: string; family?: string; band?: string; careerPath?: string; factorSummary?: string; company?: string };
  jobPurpose: string;
  setJobPurpose: (v: string) => void;
  jd: string;
  setJd: (v: string) => void;
}) {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, jobPurpose }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setJd(json.jd);
      toast.success("AI drafted a job description.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled && !jd) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">Write a job description?</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEnabled(true)}>
            Yes, use AI
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          The AI drafts a JD from the job purpose, title, department, band and your factor selections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="size-4" /> AI job description
      </div>
      <div className="space-y-2">
        <Label htmlFor="jobPurpose">Job purpose</Label>
        <Textarea
          id="jobPurpose"
          value={jobPurpose}
          onChange={(e) => setJobPurpose(e.target.value)}
          placeholder="In a sentence or two, what is this role for?"
          className="bg-card"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Generating…</> : <><Sparkles className="size-4" /> {jd ? "Regenerate" : "Generate JD"}</>}
        </Button>
        {jd && (
          <Button size="sm" variant="outline" onClick={() => setPreview(true)}>
            <Eye className="size-4" /> Preview
          </Button>
        )}
      </div>
      {jd && (
        <div className="space-y-2">
          <Label htmlFor="jd">Generated JD (editable)</Label>
          <Textarea id="jd" value={jd} onChange={(e) => setJd(e.target.value)} className="min-h-[180px] bg-card font-mono text-xs" />
        </div>
      )}
      <JDViewer open={preview} onOpenChange={setPreview} title={context.title} jd={jd} />
    </div>
  );
}
