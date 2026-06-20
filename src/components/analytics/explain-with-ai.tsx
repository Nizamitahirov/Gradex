"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Lang = "en" | "az";

/**
 * "Explain this with AI" — a small button that opens a modal, lets the user
 * pick English or Azerbaijani, and explains the given chart/table data.
 */
export function ExplainWithAI({
  title,
  kind = "chart",
  data,
  variant = "icon",
}: {
  title: string;
  kind?: "chart" | "table";
  data: unknown | (() => unknown);
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>("en");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");

  const run = async (language: Lang) => {
    setLang(language);
    setLoading(true);
    setError("");
    setResult("");
    try {
      const payload = typeof data === "function" ? (data as () => unknown)() : data;
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind, data: payload, language }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
          onClick={() => { setOpen(true); setResult(""); setError(""); }}
          title="Explain this with AI"
        >
          <Sparkles className="size-3.5" /> Explain
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => { setOpen(true); setResult(""); setError(""); }}>
          <Sparkles className="size-4" /> Explain with AI
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Explain: {title}</DialogTitle>
            <DialogDescription>Choose a language and AI will explain this {kind} in plain words.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <LangBtn active={lang === "en"} onClick={() => run("en")} disabled={loading}>🇬🇧 English</LangBtn>
            <LangBtn active={lang === "az"} onClick={() => run("az")} disabled={loading}>🇦🇿 Azərbaycanca</LangBtn>
          </div>

          <div className="min-h-[160px] rounded-xl border border-border bg-card/60 p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {lang === "az" ? "Təhlil edilir…" : "Analyzing…"}
              </div>
            ) : error ? (
              <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : result ? (
              <Markdown content={result} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {lang === "az" ? "Dil seçin və izah avtomatik yaranacaq." : "Pick a language to generate the explanation."}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LangBtn({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
