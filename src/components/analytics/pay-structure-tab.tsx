"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, Star, Sparkles, Loader2, Table2, GitCompare, FileDown, TrendingUp, MoveHorizontal, Coins, Layers } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { usePayStructures, usePayStructureMutations, type PayStructure } from "@/hooks/use-pay-structures";
import { computePayScale, formatMoney, type PayRow, type PayScaleParams } from "@/lib/pay/scale";
import { exportTableToExcel } from "@/lib/export/excel";
import { ExplainWithAI } from "@/components/analytics/explain-with-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GradeBadge } from "@/components/grade-badge";
import { Markdown } from "@/components/markdown";

export function PayStructureTab() {
  const { data: org } = useOrgData();
  const { data: structures } = usePayStructures();
  const { create, remove, makeBase } = usePayStructureMutations();

  const gradesAsc = React.useMemo(() => {
    const r = org?.org?.scoping?.result;
    if (!r) return [] as number[];
    const out: number[] = [];
    for (let g = r.bottomGrade; g <= r.topGrade; g++) out.push(g);
    return out;
  }, [org]);

  const hasBase = (structures ?? []).some((s) => s.isBase);
  const [name, setName] = React.useState("");
  const [startMedian, setStartMedian] = React.useState(24000);
  const [verticalPct, setVerticalPct] = React.useState(12);
  const [horizontalPct, setHorizontalPct] = React.useState(8);
  const [currency, setCurrency] = React.useState(org?.org?.currency ?? "USD");
  const [showCreate, setShowCreate] = React.useState(false);

  const params: PayScaleParams = { startMedian, verticalPct: verticalPct / 100, horizontalPct: horizontalPct / 100, currency, rounding: 50 };
  const preview = React.useMemo(() => computePayScale(params, gradesAsc), [startMedian, verticalPct, horizontalPct, currency, gradesAsc]);

  const save = async () => {
    try {
      await create.mutateAsync({
        name: name.trim() || (hasBase ? `Scenario ${(structures?.length ?? 0)}` : "Current grade table"),
        isBase: !hasBase,
        params,
        rows: preview,
      });
      toast.success(hasBase ? "Scenario created" : "Current grade table created");
      setShowCreate(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (!org?.org?.scoping?.completed) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Complete scoping first to know which grades to build the pay scale for.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Create / scenario builder */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {hasBase ? "Create scenario" : "Create current grade table"}
          </CardTitle>
          <Button variant={showCreate ? "secondary" : "default"} onClick={() => setShowCreate((s) => !s)}>
            <Plus className="size-4" /> {hasBase ? "New scenario" : "Build grade table"}
          </Button>
        </CardHeader>
        {showCreate && (
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={hasBase ? "Scenario A" : "Current grade table"} />
              </div>
              <div className="space-y-1.5">
                <Label>Start median (grade {gradesAsc[0]})</Label>
                <Input type="number" value={startMedian} onChange={(e) => setStartMedian(Number(e.target.value))} className="tnum" />
              </div>
              <div className="space-y-1.5">
                <Label>Vertical step % (per grade)</Label>
                <Input type="number" value={verticalPct} onChange={(e) => setVerticalPct(Number(e.target.value))} className="tnum" />
              </div>
              <div className="space-y-1.5">
                <Label>Horizontal step % (per point)</Label>
                <Input type="number" value={horizontalPct} onChange={(e) => setHorizontalPct(Number(e.target.value))} className="tnum" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "AZN", "JPY"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Midpoint progression +{verticalPct}%/grade</Badge>
              <Badge variant="secondary">Range spread {preview[0]?.spreadPct ?? 0}% (UD/LD)</Badge>
              <Badge variant="secondary">{gradesAsc.length} grades</Badge>
            </div>
            <ScaleTable rows={preview} currency={currency} />
            <div className="flex justify-end gap-2">
              <ExplainWithAI title="Pay structure" kind="table" variant="button" data={() => ({ currency, rows: preview })} />
              <Button variant="outline" onClick={() => exportScale(preview, currency, name.trim() || "pay-structure")} disabled={preview.length === 0}>
                <FileDown className="size-4" /> Export to Excel
              </Button>
              <Button onClick={save} disabled={create.isPending}>
                {create.isPending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Table2 className="size-4" /> Save {hasBase ? "scenario" : "current grade table"}</>}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Saved structures */}
      {(structures ?? []).map((s) => (
        <SavedStructure key={s.id} s={s} onDelete={() => remove.mutate(s.id)} onMakeBase={() => makeBase.mutate(s.id)} />
      ))}

      {/* Compare */}
      {(structures?.length ?? 0) >= 2 && <ComparePanel structures={structures!} />}
    </div>
  );
}

function exportScale(rows: PayRow[], currency: string, name: string) {
  exportTableToExcel({
    sheet: "Pay structure",
    columns: [
      { header: "Grade", key: "grade", width: 10 },
      { header: "LD (lower decile)", key: "ld", width: 18 },
      { header: "LQ (lower quartile)", key: "lq", width: 18 },
      { header: "Median", key: "median", width: 16 },
      { header: "UQ (upper quartile)", key: "uq", width: 18 },
      { header: "UD (upper decile)", key: "ud", width: 18 },
      { header: "Range spread %", key: "spread", width: 16 },
      { header: "Currency", key: "currency", width: 10 },
    ],
    rows: [...rows]
      .sort((a, b) => b.grade - a.grade)
      .map((r) => ({
        grade: `G${r.grade}`,
        ld: r.ld,
        lq: r.lq,
        median: r.median,
        uq: r.uq,
        ud: r.ud,
        spread: `${r.spreadPct ?? Math.round((r.ud / r.ld - 1) * 100)}%`,
        currency,
      })),
    filename: `${name.replace(/\s+/g, "-").toLowerCase()}-pay-structure.xlsx`,
  });
}

function ScaleTable({ rows, currency }: { rows: { grade: number; ld: number; lq: number; median: number; uq: number; ud: number }[]; currency: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Grade</th>
            <th className="px-3 py-2 text-right font-semibold">LD</th>
            <th className="px-3 py-2 text-right font-semibold">LQ</th>
            <th className="px-3 py-2 text-right font-semibold">Median</th>
            <th className="px-3 py-2 text-right font-semibold">UQ</th>
            <th className="px-3 py-2 text-right font-semibold">UD</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.grade} className="border-t border-border">
              <td className="px-3 py-1.5"><GradeBadge grade={r.grade} size="sm" /></td>
              <td className="px-3 py-1.5 text-right tnum text-muted-foreground">{formatMoney(r.ld, currency)}</td>
              <td className="px-3 py-1.5 text-right tnum text-muted-foreground">{formatMoney(r.lq, currency)}</td>
              <td className="px-3 py-1.5 text-right font-semibold tnum">{formatMoney(r.median, currency)}</td>
              <td className="px-3 py-1.5 text-right tnum text-muted-foreground">{formatMoney(r.uq, currency)}</td>
              <td className="px-3 py-1.5 text-right tnum text-muted-foreground">{formatMoney(r.ud, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <p className="min-w-0 truncate text-xs font-medium text-muted-foreground" title={label}>{label}</p>
      </div>
      <div className="mt-auto">
        <p className="truncate text-base font-bold leading-tight tnum" title={value}>{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub ?? " "}</p>
      </div>
    </div>
  );
}

function SavedStructure({ s, onDelete, onMakeBase }: { s: PayStructure; onDelete: () => void; onMakeBase: () => void }) {
  const [open, setOpen] = React.useState(false);
  const sorted = [...s.rows].sort((a, b) => a.grade - b.grade);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const cur = s.params.currency;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="truncate">{s.name}</span>
            {s.isBase ? (
              <Badge variant="success"><Star className="size-3" /> Base</Badge>
            ) : (
              <Badge variant="secondary">Scenario</Badge>
            )}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {sorted.length} grades · median range {formatMoney(lowest?.median ?? 0, cur)} → {formatMoney(highest?.median ?? 0, cur)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ExplainWithAI title={`Pay structure — ${s.name}`} kind="table" data={() => ({ currency: cur, rows: s.rows })} />
          <Button variant="ghost" size="sm" onClick={() => exportScale(s.rows, cur, s.name)}><FileDown className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "View"}</Button>
          {!s.isBase && <Button variant="ghost" size="sm" onClick={onMakeBase}><Star className="size-4" /> Set base</Button>}
          {!s.isBase && <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="size-4" /></Button>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics on the card surface */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Metric icon={Coins} label="Start median" value={formatMoney(s.params.startMedian, cur)} sub={`grade ${lowest?.grade ?? "—"}`} />
          <Metric icon={TrendingUp} label="Vertical step" value={`+${Math.round(s.params.verticalPct * 100)}%`} sub="per grade" />
          <Metric icon={MoveHorizontal} label="Horizontal step" value={`+${Math.round(s.params.horizontalPct * 100)}%`} sub="per point" />
          <Metric icon={Layers} label="Range spread" value={`${lowest?.spreadPct ?? 0}%`} sub="UD / LD" />
          <Metric icon={Coins} label="Top median" value={formatMoney(highest?.median ?? 0, cur)} sub={`grade ${highest?.grade ?? "—"}`} />
        </div>
        {open && <ScaleTable rows={s.rows} currency={cur} />}
      </CardContent>
    </Card>
  );
}

function ComparePanel({ structures }: { structures: PayStructure[] }) {
  const [aId, setAId] = React.useState(structures.find((s) => s.isBase)?.id ?? structures[0].id);
  const [bId, setBId] = React.useState(structures.find((s) => !s.isBase)?.id ?? structures[1]?.id);
  const [loading, setLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState("");

  const run = async () => {
    const a = structures.find((s) => s.id === aId);
    const b = structures.find((s) => s.id === bId);
    if (!a || !b || a.id === b.id) { toast.error("Pick two different structures."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/compare-structures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: { name: a.name, rows: a.rows }, b: { name: b.name, rows: b.rows } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAnalysis(json.analysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitCompare className="size-4 text-primary" /> Compare structures (AI)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={aId} onValueChange={setAId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">vs</span>
          <Select value={bId} onValueChange={setBId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={run} disabled={loading}>
            {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4" /> Compare with AI</>}
          </Button>
        </div>
        {analysis && <div className="rounded-xl border border-border bg-card/60 p-4"><Markdown content={analysis} /></div>}
      </CardContent>
    </Card>
  );
}
