"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, Download, Play, Loader2, Sparkles, Users, AlertTriangle, Wallet, Scale, FileDown, FileText, Coins } from "lucide-react";
import { ExplainWithAI } from "@/components/analytics/explain-with-ai";
import { useOrgData } from "@/hooks/use-org-data";
import { usePayStructures } from "@/hooks/use-pay-structures";
import { downloadEmployeeTemplate, parseEmployees } from "@/lib/pay/employee-file";
import { assignEmployees, analyzeWorkforce, type AssignedEmployee, type EmployeeInput, type PayAnalysis } from "@/lib/pay/analytics";
import { formatMoney } from "@/lib/pay/scale";
import { exportTableToExcel } from "@/lib/export/excel";
import { buildPayAnalysisDocument } from "@/lib/export/pay-analysis-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { GradeBadge } from "@/components/grade-badge";
import { Markdown } from "@/components/markdown";
import { PayRangeChart, AnalyticsDonut, Columns, HBars, ProfileRadar, kfmt } from "@/components/analytics/charts";

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

  const exportAssignment = () => {
    exportTableToExcel({
      sheet: "Workforce",
      columns: [
        { header: "Badge", key: "badge", width: 12 },
        { header: "Employee", key: "name", width: 26 },
        { header: "Position", key: "position", width: 26 },
        { header: "Department", key: "department", width: 20 },
        { header: "Division", key: "division", width: 20 },
        { header: "Team", key: "team", width: 18 },
        { header: "Gender", key: "gender", width: 10 },
        { header: "Grade", key: "grade", width: 8 },
        { header: "Band", key: "band", width: 22 },
        { header: "Salary", key: "salary", width: 14 },
        { header: "Compa-ratio", key: "compa", width: 14 },
        { header: "Penetration", key: "penetration", width: 14 },
        { header: "Zone", key: "zone", width: 10 },
        { header: "Status", key: "status", width: 14 },
      ],
      rows: assigned.map((e) => ({
        badge: e.badge,
        name: e.name,
        position: e.position,
        department: e.department,
        division: e.division ?? "",
        team: e.team ?? "",
        gender: e.gender ?? "",
        grade: e.grade != null ? `G${e.grade}` : "—",
        band: e.bandName ?? "—",
        salary: e.salary,
        compa: e.placement ? `${Math.round(e.placement.compaRatio * 100)}%` : "—",
        penetration: e.placement ? `${Math.round(e.placement.penetration)}%` : "—",
        zone: e.placement?.zone ?? "—",
        status: e.placement?.status ?? "unmatched",
      })),
      filename: `${(org?.org?.name ?? "gradex").replace(/\s+/g, "-").toLowerCase()}-workforce.xlsx`,
    });
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
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Workforce — grade assignment</CardTitle>
            <div className="flex items-center gap-1">
              <ExplainWithAI
                title="Workforce grade assignment"
                kind="table"
                data={() => ({
                  count: assigned.length,
                  byStatus: {
                    underpaid: assigned.filter((e) => e.placement?.status === "underpaid").length,
                    meets: assigned.filter((e) => e.placement?.status === "meets").length,
                    overpaid: assigned.filter((e) => e.placement?.status === "overpaid").length,
                  },
                  sample: assigned.slice(0, 25).map((e) => ({
                    position: e.position, grade: e.grade, salary: e.salary,
                    compa: e.placement ? Math.round(e.placement.compaRatio * 100) : null,
                    status: e.placement?.status ?? "unmatched",
                  })),
                })}
              />
              <Button variant="outline" size="sm" onClick={exportAssignment}>
                <FileDown className="size-4" /> Export to Excel
              </Button>
            </div>
          </CardHeader>
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
      {analysis && (
        <AnalysisView
          a={analysis}
          assigned={assigned}
          rows={base.rows}
          currency={currency}
          orgName={org?.org?.name ?? "Gradex"}
          onInsights={runInsights}
          aiLoading={aiLoading}
          insights={insights}
        />
      )}
    </div>
  );
}

function AnalysisView({
  a,
  assigned,
  rows,
  currency,
  orgName,
  onInsights,
  aiLoading,
  insights,
}: {
  a: PayAnalysis;
  assigned: AssignedEmployee[];
  rows: import("@/lib/pay/scale").PayRow[];
  currency: string;
  orgName: string;
  onInsights: () => void;
  aiLoading: boolean;
  insights: string;
}) {
  const money = (v: number) => formatMoney(v, currency);

  const downloadHtml = () => {
    const { html, filename } = buildPayAnalysisDocument(a, currency, orgName);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusDonut = [
    { name: "In range", value: a.meets, fill: "var(--success)" },
    { name: "Underpaid", value: a.underpaid, fill: "var(--destructive)" },
    { name: "Overpaid", value: a.overpaid, fill: "#F5A524" },
  ];
  const genderDonut = a.byGender.map((g) => ({
    name: g.label,
    value: g.count,
    fill: g.label === "Male" ? "var(--primary)" : g.label === "Female" ? "#E879C8" : "var(--muted-foreground)",
  }));
  const bandDonut = a.byBand.map((b, i) => ({
    name: b.label,
    value: b.value,
    fill: ["#6E56CF", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#8B5CF6", "#EF4444", "#14B8A6"][i % 9],
  }));
  const radar = a.byGrade
    .slice()
    .sort((x, y) => x.grade - y.grade)
    .map((g) => ({ axis: `G${g.grade}`, value: Math.round(g.avgCompa * 100) }));
  const genderPayBars = a.byGender.map((g) => ({ label: g.label, value: g.avgSalary }));

  return (
    <div className="space-y-6">
      {/* Report header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Workforce & pay analysis</h2>
          <p className="text-sm text-muted-foreground">{a.headcount} employees analyzed against the current grade table</p>
        </div>
        <Button variant="outline" onClick={downloadHtml}>
          <FileText className="size-4" /> Download as HTML
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Headcount" value={a.headcount} icon={Users} hint={`${a.assigned} matched`} />
        <StatCard label="Total cost" value={kfmt(a.totalCost, currency)} icon={Wallet} hint={money(a.totalCost)} />
        <StatCard label="Avg salary" value={kfmt(a.avgSalary, currency)} icon={Coins} hint={`median ${kfmt(a.medianSalary, currency)}`} />
        <StatCard label="Avg compa-ratio" value={`${Math.round(a.avgCompaRatio * 100)}%`} icon={Scale} hint="salary ÷ median" />
        <StatCard label="Cost to minimum" value={kfmt(a.budgetToMin, currency)} icon={Wallet} hint="bring underpaid to min" />
        <StatCard label="Gender pay gap" value={`${a.genderPayGapMean}%`} icon={AlertTriangle} hint={`median ${a.genderPayGapMedian}%`} />
      </div>

      {/* Signature pay range chart */}
      <ChartCard
        title="Pay positioning — range (min→max), median line, and each employee"
        explain={{ currency, byGrade: a.byGrade, underpaid: a.underpaid, overpaid: a.overpaid, meets: a.meets }}
      >
        <PayRangeChart assigned={assigned} rows={rows} currency={currency} />
        <Legend
          items={[
            { c: "var(--success)", l: "In range" },
            { c: "var(--destructive)", l: "Underpaid" },
            { c: "#F5A524", l: "Overpaid" },
            { c: "var(--primary)", l: "Range / median" },
          ]}
        />
      </ChartCard>

      {/* Donuts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Pay competitiveness" explain={statusDonut}><AnalyticsDonut data={statusDonut} centerLabel="employees" /></ChartCard>
        <ChartCard title="Headcount by gender" explain={genderDonut}><AnalyticsDonut data={genderDonut} centerLabel="employees" /></ChartCard>
        <ChartCard title="Headcount by band" explain={bandDonut}><AnalyticsDonut data={bandDonut} centerLabel="employees" /></ChartCard>
      </div>

      {/* Columns + radar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Compa-ratio distribution" explain={a.compaDistribution}><Columns data={a.compaDistribution} color="var(--info)" /></ChartCard>
        <ChartCard title="Range placement (quartiles)" explain={a.quartileDistribution}><Columns data={a.quartileDistribution} color="var(--primary)" /></ChartCard>
        <ChartCard title="Average compa-ratio by grade (radar)" explain={radar}><ProfileRadar data={radar} /></ChartCard>
        <ChartCard title="Average pay by gender" explain={{ currency, data: genderPayBars }}><Columns data={genderPayBars} color="#E879C8" money currency={currency} /></ChartCard>
      </div>

      {/* Tenure / age / department */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Headcount by tenure" explain={a.tenureGroups}><Columns data={a.tenureGroups} color="var(--success)" /></ChartCard>
        <ChartCard title="Headcount by age group" explain={a.ageGroups}><Columns data={a.ageGroups} color="#F5A524" /></ChartCard>
        <ChartCard title="Headcount by department" explain={{ currency, data: a.byDepartment }}><HBars data={a.byDepartment.map((d) => ({ label: d.label, value: d.count }))} color="var(--primary)" /></ChartCard>
        <ChartCard title="Average salary by department" explain={{ currency, data: a.byDepartment }}><HBars data={a.byDepartment.map((d) => ({ label: d.label, value: d.avgSalary }))} color="#06B6D4" money currency={currency} /></ChartCard>
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

function Legend({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: i.c }} /> {i.l}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, children, explain }: { title: string; children: React.ReactNode; explain?: unknown }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {explain !== undefined && <ExplainWithAI title={title} kind="chart" data={explain} />}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
