"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Sparkles, UploadCloud, Loader2, History, Pencil, Trash2,
  Download, Copy, Save, RotateCcw, Bot, FileUp, FilePen, Wand2, ScanSearch,
  Languages, AlertTriangle, FileX2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOrgData } from "@/hooks/use-org-data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Markdown } from "@/components/markdown";
import { AnalyticsDonut } from "@/components/analytics/charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface JdRow {
  id: string;
  title: string;
  jobTitle?: string;
  content: string;
  contentAz?: string;
  source: "ai" | "upload" | "manual";
  currentVersion: number;
  aiRewritten?: boolean;
  jobId?: string | null;
  createdByName?: string;
  updatedAt: number;
}
interface JdVersion {
  id: string;
  version: number;
  content: string;
  note?: string;
  source?: string;
  createdByName?: string;
  createdAt: number;
}

const SOURCE_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  ai: { label: "AI", icon: Bot, cls: "bg-primary/10 text-primary" },
  upload: { label: "Uploaded", icon: FileUp, cls: "bg-info/10 text-info" },
  manual: { label: "Manual", icon: FilePen, cls: "bg-muted text-muted-foreground" },
};

type Grading = "aligned" | "ungraded" | "review" | "unlinked";

interface Enriched extends JdRow {
  department: string;
  section: string;
  division: string;
  position: string;
  hasEn: boolean;
  hasAz: boolean;
  grading: Grading;
}

const ALL = "all";

export default function JobDescriptionsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: org } = useOrgData();
  const { data: jds, isLoading } = useQuery<JdRow[]>({
    queryKey: ["jds"],
    queryFn: async () => {
      const res = await fetch("/api/jds", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.jds;
    },
  });

  const jobs = React.useMemo(() => org?.jobs ?? [], [org]);
  const families = React.useMemo(() => org?.families ?? [], [org]);
  const evaluations = React.useMemo(() => org?.evaluations ?? [], [org]);

  const familyMap = React.useMemo(() => Object.fromEntries(families.map((f) => [f.id, f.name])), [families]);
  const jobById = React.useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const gradedAtByJob = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of evaluations) {
      const jid = e.jobId ?? "";
      if (!jid) continue;
      m[jid] = Math.max(m[jid] ?? 0, e.gradedAt ?? 0);
    }
    return m;
  }, [evaluations]);

  const enriched: Enriched[] = React.useMemo(() => {
    return (jds ?? []).map((jd) => {
      const job = jd.jobId ? jobById[jd.jobId] : undefined;
      let grading: Grading = "unlinked";
      if (job) {
        const gradedAt = gradedAtByJob[job.id] ?? 0;
        if (job.currentGrade == null || gradedAt === 0) grading = "ungraded";
        else if (jd.updatedAt > gradedAt + 1000) grading = "review";
        else grading = "aligned";
      }
      return {
        ...jd,
        department: job ? familyMap[job.familyId] ?? "—" : "—",
        section: job?.section?.trim() || "—",
        division: job?.division?.trim() || "—",
        position: jd.jobTitle?.trim() || job?.title || jd.title,
        hasEn: !!jd.content?.trim(),
        hasAz: !!jd.contentAz?.trim(),
        grading,
      };
    });
  }, [jds, jobById, gradedAtByJob, familyMap]);

  // Filters
  const [fDept, setFDept] = React.useState(ALL);
  const [fSection, setFSection] = React.useState(ALL);
  const [fDivision, setFDivision] = React.useState(ALL);
  const [fPosition, setFPosition] = React.useState(ALL);
  const [fLang, setFLang] = React.useState(ALL);
  const [fSource, setFSource] = React.useState(ALL);

  const distinct = (key: "department" | "section" | "division" | "position") =>
    [...new Set(enriched.map((e) => e[key]).filter((v) => v && v !== "—"))].sort();

  const filtered = enriched.filter((e) => {
    if (fDept !== ALL && e.department !== fDept) return false;
    if (fSection !== ALL && e.section !== fSection) return false;
    if (fDivision !== ALL && e.division !== fDivision) return false;
    if (fPosition !== ALL && e.position !== fPosition) return false;
    if (fSource !== ALL && e.source !== fSource) return false;
    if (fLang === "en" && !(e.hasEn && !e.hasAz)) return false;
    if (fLang === "az" && !(e.hasAz && !e.hasEn)) return false;
    if (fLang === "both" && !(e.hasEn && e.hasAz)) return false;
    return true;
  });

  // Stats (real)
  const total = enriched.length;
  const linkedJobIds = new Set(enriched.map((e) => e.jobId).filter(Boolean) as string[]);
  const jobsWithoutJd = jobs.filter((j) => !linkedJobIds.has(j.id)).length;
  const aiRewritten = enriched.filter((e) => e.aiRewritten).length;
  const needsReview = enriched.filter((e) => e.grading === "ungraded" || e.grading === "review").length;
  const bilingual = enriched.filter((e) => e.hasEn && e.hasAz).length;
  const enOnly = enriched.filter((e) => e.hasEn && !e.hasAz).length;
  const azOnly = enriched.filter((e) => e.hasAz && !e.hasEn).length;

  const langDonut = [
    { name: "English only", value: enOnly, fill: "var(--primary)" },
    { name: "Azerbaijani only", value: azOnly, fill: "#16C098" },
    { name: "Bilingual", value: bilingual, fill: "#F5A524" },
  ];
  const sourceDonut = [
    { name: "AI generated", value: enriched.filter((e) => e.source === "ai").length, fill: "var(--primary)" },
    { name: "Uploaded", value: enriched.filter((e) => e.source === "upload").length, fill: "#4DABF7" },
    { name: "Manual", value: enriched.filter((e) => e.source === "manual").length, fill: "var(--muted-foreground)" },
  ];
  const gradingDonut = [
    { name: "Aligned", value: enriched.filter((e) => e.grading === "aligned").length, fill: "var(--success)" },
    { name: "Job not graded", value: enriched.filter((e) => e.grading === "ungraded").length, fill: "var(--destructive)" },
    { name: "Needs re-grade", value: enriched.filter((e) => e.grading === "review").length, fill: "#F5A524" },
    { name: "Unlinked", value: enriched.filter((e) => e.grading === "unlinked").length, fill: "var(--muted-foreground)" },
  ];

  const [selected, setSelected] = React.useState<string | null>(null);
  const [composer, setComposer] = React.useState<null | "manual" | "ai" | "upload">(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["jds"] }); qc.invalidateQueries({ queryKey: ["org-data"] }); };
  const canCreate = can("jd", "create");

  const resetFilters = () => { setFDept(ALL); setFSection(ALL); setFDivision(ALL); setFPosition(ALL); setFLang(ALL); setFSource(ALL); };
  const hasFilters = [fDept, fSection, fDivision, fPosition, fLang, fSource].some((v) => v !== ALL);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Descriptions"
        description="Every AI-generated, uploaded and hand-written job description — with statistics, version history and bilingual support."
        action={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setComposer("upload")}><UploadCloud className="size-4" /> Upload</Button>
              <Button variant="outline" onClick={() => setComposer("ai")}><Sparkles className="size-4" /> Generate with AI</Button>
              <Button onClick={() => setComposer("manual")}><Plus className="size-4" /> New JD</Button>
            </div>
          ) : undefined
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total JDs" value={total} icon={FileText} hint={`${jobs.length} jobs in system`} />
        <StatCard label="Jobs without a JD" value={jobsWithoutJd} icon={FileX2} hint={`of ${jobs.length} jobs`} />
        <StatCard label="AI-rewritten" value={aiRewritten} icon={Wand2} hint="improved with AI" />
        <StatCard label="Grading mismatches" value={needsReview} icon={AlertTriangle} hint="ungraded / re-grade" />
        <StatCard label="Bilingual" value={bilingual} icon={Languages} hint={`${enOnly} EN-only · ${azOnly} AZ-only`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatsChart title="Language coverage"><AnalyticsDonut data={langDonut} centerLabel="JDs" /></StatsChart>
        <StatsChart title="By source"><AnalyticsDonut data={sourceDonut} centerLabel="JDs" /></StatsChart>
        <StatsChart title="Grading alignment"><AnalyticsDonut data={gradingDonut} centerLabel="JDs" /></StatsChart>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={fDept} onChange={setFDept} placeholder="Department" allLabel="All departments" options={distinct("department")} />
        <FilterSelect value={fSection} onChange={setFSection} placeholder="Section" allLabel="All sections" options={distinct("section")} />
        <FilterSelect value={fDivision} onChange={setFDivision} placeholder="Division" allLabel="All divisions" options={distinct("division")} />
        <FilterSelect value={fPosition} onChange={setFPosition} placeholder="Position" allLabel="All positions" options={distinct("position")} />
        <Select value={fLang} onValueChange={setFLang}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Language" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All languages</SelectItem>
            <SelectItem value="en">English only</SelectItem>
            <SelectItem value="az">Azerbaijani only</SelectItem>
            <SelectItem value="both">Bilingual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fSource} onValueChange={setFSource}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
            <SelectItem value="upload">Uploaded</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear</Button>}
        <span className="ml-auto text-xs text-muted-foreground tnum">{filtered.length} of {total} shown</span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : total === 0 ? (
        <EmptyState icon={FileText} title="No job descriptions yet" description="Generate one with AI, upload a file, or write one from scratch." />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No job descriptions match these filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((jd) => {
            const meta = SOURCE_META[jd.source] ?? SOURCE_META.manual;
            const Icon = meta.icon;
            return (
              <Card key={jd.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelected(jd.id)}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
                        <Icon className="size-3" /> {meta.label}
                      </span>
                      {jd.aiRewritten && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><Wand2 className="size-3" /> Rewritten</span>}
                    </div>
                  </div>
                  <div>
                    <p className="line-clamp-1 font-semibold">{jd.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{(jd.content || jd.contentAz || "").replace(/[#*_>`-]/g, "").slice(0, 140)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {jd.department !== "—" && <Badge variant="secondary" className="font-normal">{jd.department}</Badge>}
                    <LangChips hasEn={jd.hasEn} hasAz={jd.hasAz} />
                    <GradingChip grading={jd.grading} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><History className="size-3" /> v{jd.currentVersion}</span>
                    <span>{new Date(jd.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selected && <JdDetail id={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
      {composer && <Composer mode={composer} onClose={() => setComposer(null)} onSaved={() => { setComposer(null); refresh(); }} />}
    </div>
  );
}

function StatsChart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function FilterSelect({ value, onChange, placeholder, allLabel, options }: { value: string; onChange: (v: string) => void; placeholder: string; allLabel: string; options: string[] }) {
  if (options.length === 0) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function LangChips({ hasEn, hasAz }: { hasEn: boolean; hasAz: boolean }) {
  return (
    <span className="inline-flex gap-1">
      {hasEn && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">EN</span>}
      {hasAz && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">AZ</span>}
    </span>
  );
}

const GRADING_META: Record<Grading, { label: string; cls: string }> = {
  aligned: { label: "Aligned", cls: "bg-success/10 text-success" },
  ungraded: { label: "Job not graded", cls: "bg-destructive/10 text-destructive" },
  review: { label: "Re-grade", cls: "bg-warning/15 text-warning-foreground" },
  unlinked: { label: "Unlinked", cls: "bg-muted text-muted-foreground" },
};
function GradingChip({ grading }: { grading: Grading }) {
  const m = GRADING_META[grading];
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", m.cls)}>{m.label}</span>;
}

/* ---------------- Detail ---------------- */
function JdDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery<{ jd: JdRow; versions: JdVersion[] }>({
    queryKey: ["jd", id],
    queryFn: async () => {
      const res = await fetch(`/api/jds/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return { jd: json.jd, versions: json.versions };
    },
  });

  const [lang, setLang] = React.useState<"en" | "az">("en");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [busyAz, setBusyAz] = React.useState(false);
  const [viewVersion, setViewVersion] = React.useState<JdVersion | null>(null);
  const [rewriteOpen, setRewriteOpen] = React.useState(false);
  const [analyzeOpen, setAnalyzeOpen] = React.useState(false);

  const jd = data?.jd;
  const canEdit = can("jd", "edit");
  const canDelete = can("jd", "delete");
  const shown = lang === "en" ? jd?.content ?? "" : jd?.contentAz ?? "";

  const startEdit = () => { setDraft(shown); setNote(""); setEditing(true); };

  const saveEdit = async () => {
    if (!draft.trim()) return toast.error("Content can't be empty");
    setSaving(true);
    try {
      const body = lang === "az"
        ? { contentAz: draft }
        : { content: draft, note: note.trim() || "Edited" };
      const res = await fetch(`/api/jds/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(lang === "az" ? "Azerbaijani version saved" : `Saved as v${json.version}`);
      setEditing(false);
      await refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const translateAz = async () => {
    if (!jd?.content?.trim()) return toast.error("There is no English content to translate");
    setBusyAz(true);
    try {
      const res = await fetch("/api/ai/jd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "translate", target: "az", jd: jd.content, title: jd.title }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const save = await fetch(`/api/jds/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentAz: json.jd }) });
      const sj = await save.json();
      if (!sj.success) throw new Error(sj.error);
      toast.success("Azerbaijani version created");
      setLang("az");
      await refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setBusyAz(false);
    }
  };

  const restore = async (v: JdVersion) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jds/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: v.content, note: `Restored from v${v.version}` }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Restored v${v.version} as v${json.version}`);
      setViewVersion(null);
      await refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this job description and all its versions?")) return;
    const res = await fetch(`/api/jds/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["jds"] });
    onChanged();
    onClose();
  };

  const exportHtml = () => {
    if (!jd) return;
    const body = shown || jd.content;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${jd.title}</title><style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#0f1129;line-height:1.6}h1{letter-spacing:-.02em}</style></head><body><h1>${jd.title}</h1><pre style="white-space:pre-wrap;font-family:inherit">${body.replace(/</g, "&lt;")}</pre></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${jd.title.replace(/\s+/g, "-").toLowerCase()}${lang === "az" ? "-az" : ""}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-hidden p-0">
        {isLoading || !jd ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex max-h-[94vh] flex-col">
            {/* Header */}
            <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-br from-primary/5 to-transparent p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-lg">{jd.title}</DialogTitle>
                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">v{jd.currentVersion}</Badge>
                      {jd.aiRewritten && <Badge variant="default" className="gap-1"><Wand2 className="size-3" /> AI-rewritten</Badge>}
                      <LangChips hasEn={!!jd.content?.trim()} hasAz={!!jd.contentAz?.trim()} />
                    </DialogDescription>
                  </div>
                </div>
                {/* Language switch */}
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                  <button onClick={() => setLang("en")} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>EN</button>
                  <button onClick={() => setLang("az")} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", lang === "az" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>AZ</button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setAnalyzeOpen(true)}><ScanSearch className="size-4" /> Analyze</Button>
                {canEdit && <Button variant="outline" size="sm" onClick={() => setRewriteOpen(true)}><Wand2 className="size-4" /> Rewrite with AI</Button>}
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={translateAz} disabled={busyAz}>
                    {busyAz ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />} {jd.contentAz?.trim() ? "Regenerate AZ" : "Azerbaijani version"}
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(shown); toast.success("Copied"); }}><Copy className="size-4" /></Button>
                <Button variant="ghost" size="sm" onClick={exportHtml}><Download className="size-4" /></Button>
                {canEdit && !editing && <Button variant="ghost" size="sm" onClick={startEdit}><Pencil className="size-4" /> Edit</Button>}
                {canDelete && <Button variant="ghost" size="sm" onClick={del}><Trash2 className="size-4" /></Button>}
              </div>
            </DialogHeader>

            <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_280px]">
              {/* Content / editor */}
              <div className="overflow-y-auto p-5">
                {editing ? (
                  <div className="space-y-3">
                    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[360px] font-mono text-sm" />
                    {lang === "en" && <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed? (optional version note)" />}
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button onClick={saveEdit} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : lang === "az" ? "Save Azerbaijani version" : "Save new version"}</Button>
                    </div>
                  </div>
                ) : shown.trim() ? (
                  <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-4 prose-headings:font-bold prose-h2:mt-6 prose-h2:border-b prose-h2:border-border prose-h2:pb-1.5 prose-h2:text-base prose-li:my-0.5">
                    <Markdown content={shown} />
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Languages className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No Azerbaijani version yet.</p>
                    {canEdit && <Button onClick={translateAz} disabled={busyAz}>{busyAz ? <><Loader2 className="size-4 animate-spin" /> Translating…</> : <><Languages className="size-4" /> Generate with AI</>}</Button>}
                  </div>
                )}
              </div>

              {/* Version history */}
              <div className="border-t border-border md:border-l md:border-t-0">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" /> Version history
                </div>
                <div className="max-h-[440px] space-y-1 overflow-y-auto p-2">
                  {(data?.versions ?? []).map((v) => {
                    const sm = SOURCE_META[v.source ?? "manual"] ?? SOURCE_META.manual;
                    return (
                      <button key={v.id} onClick={() => setViewVersion(v)} className="flex w-full items-start gap-2.5 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-accent">
                        <Badge variant={v.version === jd.currentVersion ? "default" : "outline"} className="mt-0.5 shrink-0">v{v.version}</Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{v.note || "Edited"}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <sm.icon className="size-3" /> {v.createdByName ?? "—"} · {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewVersion && jd && (
          <Dialog open onOpenChange={(o) => !o && setViewVersion(null)}>
            <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Version {viewVersion.version}</DialogTitle>
                <DialogDescription>{viewVersion.note} · {new Date(viewVersion.createdAt).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <article className="prose prose-sm max-w-none rounded-xl border border-border bg-muted/30 p-4 dark:prose-invert"><Markdown content={viewVersion.content} /></article>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setViewVersion(null)}>Close</Button>
                {canEdit && viewVersion.version !== jd.currentVersion && (
                  <Button onClick={() => restore(viewVersion)} disabled={saving}><RotateCcw className="size-4" /> Restore this version</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {rewriteOpen && jd && (
          <RewriteDialog jd={jd} onClose={() => setRewriteOpen(false)} onSaved={async () => { setRewriteOpen(false); await refetch(); onChanged(); }} />
        )}
        {analyzeOpen && jd && (
          <AnalyzeDialog jd={jd} lang={lang} onClose={() => setAnalyzeOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Rewrite with AI ---------------- */
function RewriteDialog({ jd, onClose, onSaved }: { jd: JdRow; onClose: () => void; onSaved: () => void }) {
  const [changes, setChanges] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/jd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "rewrite", currentJD: jd.content, title: jd.title, changeSummary: changes.trim() || "Improve to global best practice: tighten language, complete any missing standard sections, keep it on-level." }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDraft(json.jd);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jds/${jd.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, source: "ai", note: changes.trim() ? `AI rewrite: ${changes.trim().slice(0, 60)}` : "AI rewrite to best practice" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Rewritten — saved as v${json.version}`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="size-4 text-primary" /> Rewrite with AI</DialogTitle>
          <DialogDescription>Describe what to change, or leave blank to improve the JD to global best practice. Saved as a new version.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="e.g. Make it more senior, add data-governance responsibilities, shorten the skills section…" className="min-h-[80px]" />
          <Button variant="outline" onClick={run} disabled={busy}>{busy && !draft ? <><Loader2 className="size-4 animate-spin" /> Rewriting…</> : <><Sparkles className="size-4" /> Generate rewrite</>}</Button>
          {draft && (
            <div className="space-y-1.5">
              <Label>Preview (editable)</Label>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[300px] font-mono text-sm" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !draft.trim()}><Save className="size-4" /> Save as new version</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Analyze vs best practice ---------------- */
function AnalyzeDialog({ jd, lang, onClose }: { jd: JdRow; lang: "en" | "az"; onClose: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const content = lang === "az" && jd.contentAz?.trim() ? jd.contentAz : jd.content;
        const res = await fetch("/api/ai/jd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "analyze", jd: content, title: jd.title }),
        });
        const json = await res.json();
        if (!active) return;
        if (!json.success) throw new Error(json.error);
        setResult(json.analysis);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "AI error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [jd, lang]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanSearch className="size-4 text-primary" /> Best-practice analysis</DialogTitle>
          <DialogDescription>How &quot;{jd.title}&quot; compares to global best practice — what to add and what to trim.</DialogDescription>
        </DialogHeader>
        <div className="min-h-[200px] rounded-xl border border-border bg-card/60 p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Analyzing against best practice…</div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : (
            <article className="prose prose-sm max-w-none dark:prose-invert"><Markdown content={result} /></article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Composer: manual / AI / upload ---------------- */
function Composer({ mode, onClose, onSaved }: { mode: "manual" | "ai" | "upload"; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState("");
  const [jobPurpose, setJobPurpose] = React.useState("");
  const [content, setContent] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const generate = async () => {
    if (!title.trim()) return toast.error("Enter a job title");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/jd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), jobPurpose: jobPurpose.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setContent(json.jd);
      toast.success("Draft generated — review and save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setContent(json.text ?? "");
      if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
      toast.success("File loaded — review and save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read file");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) return toast.error("Title and content are required");
    setBusy(true);
    try {
      const res = await fetch("/api/jds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), jobTitle: title.trim(), content, source: mode === "ai" ? "ai" : mode === "upload" ? "upload" : "manual" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Job description saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === "ai" ? "Generate with AI" : mode === "upload" ? "Upload a job description" : "New job description";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>It will be saved to this company&apos;s job description library as version 1.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Financial Analyst" />
          </div>

          {mode === "ai" && (
            <div className="space-y-1.5">
              <Label>Job purpose (optional — helps the AI)</Label>
              <Textarea value={jobPurpose} onChange={(e) => setJobPurpose(e.target.value)} placeholder="One or two sentences on what this role is for…" className="min-h-[80px]" />
              <Button variant="outline" onClick={generate} disabled={busy}>
                {busy ? <><Loader2 className="size-4 animate-spin" /> Drafting…</> : <><Sparkles className="size-4" /> Draft with AI</>}
              </Button>
            </div>
          )}

          {mode === "upload" && (
            <div>
              <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-8 hover:border-primary/40 hover:bg-accent/40">
                <UploadCloud className="size-6 text-primary" />
                <span className="text-sm font-medium">Upload PDF, Word or text</span>
                <span className="text-xs text-muted-foreground">We extract the text so you can review and save it</span>
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.html" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Job description content (Markdown supported)…" className="min-h-[260px] font-mono text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim() || !content.trim()}><Save className="size-4" /> Save job description</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
