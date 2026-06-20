"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { UploadCloud, FileSpreadsheet, Download, Play, Loader2, Sparkles, Users, AlertTriangle, TrendingDown, Wallet, Scale } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { usePayStructures } from "@/hooks/use-pay-structures";
import { downloadEmployeeTemplate, parseEmployees } from "@/lib/pay/employee-file";
import { assignEmployees, analyzeWorkforce, type AssignedEmployee, type EmployeeInput, type PayAnalysis } from "@/lib/pay/analytics";
import { formatMoney } from "@/lib/pay/scale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { GradeBadge } from "@/components/grade-badge";
import { Markdown } from "@/components/markdown";

const STATUS_COLOR = { underpaid: "var(--destructive)", overpaid: "#F5A524", meets: "var(--success)" } as const;

export function WorkforceTab() {
  const { data: org } = useOrgData();
  const { data: structures } = usePayStructures();
  const base = (structures ?? []).find((s) => s.isBase);
  const jobs = org?.jobs ?? [];
  const currency = base?.params.currency ?? org?.org?.currency ?? "USD";

  const [employees, setEmployees] = React.useState<EmployeeInput[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<PayAnalysis | null>(null);
  const [insights, setInsights] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const assigned: AssignedEmployee[] = React.useMemo(
    () => (base ? assignEmployees(employees, jobs, base.rows) : []),
    [employees, jobs, base],
  );

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const emps = await parseEmployees(f);
      setEmployees(emps);
      setAnalysis(null);
      setInsights("");
      toast.success(`Loaded ${emps.length} employees`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read file");
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = () => {
    if (!base) return;
    setAnalysis(analyzeWorkforce(assigned, base.rows));
  };

  const runInsights = async () => {
    if (!analysis) return;
    setAiLoading(true);
    try {
      const summary = JSON.stringify({ currency, ...analysis }).slice(0, 8000);
      const res = await fetch("/api/ai/compare-structures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "insights", summary }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setInsights(json.analysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setAiLoading(false);
    }
  };

  if (!base) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Create a current grade table first (Pay structure tab) — the workforce is analyzed against it.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Employee data</CardTitle>
          <Button variant="outline" onClick={() => downloadEmployeeTemplate()}>
            <Download className="size-4" /> Download template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.length === 0 ? (
            <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><UploadCloud className="size-6" /></div>
              <div className="text-center">
                <p className="font-medium">Upload employee data (.xlsx)</p>
                <p className="text-sm text-muted-foreground">Badge, name, dept, division, team, position, dates, gender, salary</p>
              </div>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary"><FileSpreadsheet className="size-3" /> {employees.length} employees</Badge>
              <Badge variant="success">{assigned.filter((e) => e.grade != null).length} matched to a grade</Badge>
              {assigned.filter((e) => e.grade == null).length > 0 && (
                <Badge variant="warning">{assigned.filter((e) => e.grade == null).length} unmatched</Badge>
              )}
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>Replace file</Button>
              <Button onClick={runAnalysis} disabled={busy}>
                <Play className="size-4" /> Start analysis
              </Button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </CardContent>
      </Card>

      {/* Assignment table */}
      {employees.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Workforce — grade assignment</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Employee</th>
                    <th className="px-3 py-2 text-left font-semibold">Position</th>
                    <th className="px-3 py-2 text-left font-semibold">Dept</th>
                    <th className="px-3 py-2 text-center font-semibold">Grade</th>
                    <th className="px-3 py-2 text-left font-semibold">Band</th>
                    <th className="px-3 py-2 text-right font-semibold">Salary</th>
                    <th className="px-3 py-2 text-right font-semibold">Compa</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{e.name || e.badge}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.position}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.department}</td>
                      <td className="px-3 py-1.5 text-center">{e.grade != null ? <GradeBadge grade={e.grade} size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.bandName ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right tnum">{formatMoney(e.salary, currency)}</td>
                      <td className="px-3 py-1.5 text-right tnum">{e.placement ? `${Math.round(e.placement.compaRatio * 100)}%` : "—"}</td>
                      <td className="px-3 py-1.5 text-center">
                        {e.placement ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `color-mix(in oklch, ${STATUS_COLOR[e.placement.status]} 16%, transparent)`, color: STATUS_COLOR[e.placement.status] }}>
                            {e.placement.status}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">unmatched</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis */}
      {analysis && <AnalysisView a={analysis} currency={currency} onInsights={runInsights} aiLoading={aiLoading} insights={insights} />}
    </div>
  );
}

function AnalysisView({ a, currency, onInsights, aiLoading, insights }: { a: PayAnalysis; currency: string; onInsights: () => void; aiLoading: boolean; insights: string }) {
  const money = (v: number) => formatMoney(v, currency);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Headcount" value={a.headcount} icon={Users} hint={`${a.assigned} matched`} />
        <StatCard label="Total cost" value={money(a.totalCost)} icon={Wallet} />
        <StatCard label="Avg salary" value={money(a.avgSalary)} hint={`median ${money(a.medianSalary)}`} />
        <StatCard label="Underpaid" value={a.underpaid} icon={TrendingDown} hint={`${a.overpaid} overpaid · ${a.meets} in range`} />
        <StatCard label="Cost to minimum" value={money(a.budgetToMin)} icon={Wallet} hint="bring underpaid to range min" />
        <StatCard label="Gender pay gap" value={`${a.genderPayGapMean}%`} icon={Scale} hint={`median ${a.genderPayGapMedian}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Pay vs structure (range min/mid vs actual avg)">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={a.byGrade.map((g) => ({ grade: `G${g.grade}`, avg: g.avgSalary }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="avg" name="Avg salary" radius={[4, 4, 0, 0]} fill="var(--primary)" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Compa-ratio distribution">
          <BucketBars data={a.compaDistribution} color="var(--info)" />
        </ChartCard>

        <ChartCard title="Range placement (quartiles)">
          <BucketBars data={a.quartileDistribution} color="var(--primary)" />
        </ChartCard>

        <ChartCard title="Average pay by gender">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.byGender}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="avgSalary" name="Avg salary" radius={[4, 4, 0, 0]}>
                {a.byGender.map((_, i) => <Cell key={i} fill={["var(--primary)", "#E879C8", "var(--muted-foreground)"][i % 3]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Headcount by tenure">
          <BucketBars data={a.tenureGroups} color="var(--success)" />
        </ChartCard>

        <ChartCard title="Headcount by age group">
          <BucketBars data={a.ageGroups} color="#F5A524" />
        </ChartCard>
      </div>

      {/* AI insights */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> AI total-rewards insights</CardTitle>
          <Button onClick={onInsights} disabled={aiLoading}>
            {aiLoading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4" /> Generate insights</>}
          </Button>
        </CardHeader>
        {insights && <CardContent><div className="rounded-xl border border-border bg-card/60 p-4"><Markdown content={insights} /></div></CardContent>}
      </Card>
    </div>
  );
}

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BucketBars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
