"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Sparkles, UploadCloud, Loader2, History, Pencil, Trash2,
  Download, Copy, Save, RotateCcw, Bot, FileUp, FilePen,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Markdown } from "@/components/markdown";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface JdRow {
  id: string;
  title: string;
  jobTitle?: string;
  content: string;
  source: "ai" | "upload" | "manual";
  currentVersion: number;
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

export default function JobDescriptionsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: jds, isLoading } = useQuery<JdRow[]>({
    queryKey: ["jds"],
    queryFn: async () => {
      const res = await fetch("/api/jds", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.jds;
    },
  });

  const [selected, setSelected] = React.useState<string | null>(null);
  const [composer, setComposer] = React.useState<null | "manual" | "ai" | "upload">(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["jds"] });

  const canCreate = can("jd", "create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Descriptions"
        description="Every AI-generated, uploaded and hand-written job description — with full version history."
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

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (jds ?? []).length === 0 ? (
        <EmptyState icon={FileText} title="No job descriptions yet" description="Generate one with AI, upload a file, or write one from scratch." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(jds ?? []).map((jd) => {
            const meta = SOURCE_META[jd.source] ?? SOURCE_META.manual;
            const Icon = meta.icon;
            return (
              <Card key={jd.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelected(jd.id)}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></div>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", meta.cls)}>
                      <Icon className="size-3" /> {meta.label}
                    </span>
                  </div>
                  <div>
                    <p className="line-clamp-1 font-semibold">{jd.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{jd.content.replace(/[#*_>`-]/g, "").slice(0, 140)}</p>
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

/* ---------------- Detail: view / edit / versions / export ---------------- */
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

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [viewVersion, setViewVersion] = React.useState<JdVersion | null>(null);

  const jd = data?.jd;
  const canEdit = can("jd", "edit");
  const canDelete = can("jd", "delete");

  const startEdit = () => { setDraft(jd?.content ?? ""); setNote(""); setEditing(true); };

  const saveEdit = async () => {
    if (!draft.trim()) return toast.error("Content can't be empty");
    setSaving(true);
    try {
      const res = await fetch(`/api/jds/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, note: note.trim() || "Edited" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Saved as v${json.version}`);
      setEditing(false);
      await refetch();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const restore = async (v: JdVersion) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/jds/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: v.content, note: `Restored from v${v.version}` }),
      });
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
    onClose();
  };

  const exportHtml = () => {
    if (!jd) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${jd.title}</title><style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#0f1129;line-height:1.6}h1{letter-spacing:-.02em}</style></head><body><h1>${jd.title}</h1><pre style="white-space:pre-wrap;font-family:inherit">${jd.content.replace(/</g, "&lt;")}</pre></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${jd.title.replace(/\s+/g, "-").toLowerCase()}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        {isLoading || !jd ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex max-h-[92vh] flex-col">
            <DialogHeader className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="truncate">{jd.title}</DialogTitle>
                  <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">v{jd.currentVersion}</Badge>
                    <span>{jd.jobTitle}</span>
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(jd.content); toast.success("Copied"); }}><Copy className="size-4" /></Button>
                  <Button variant="outline" size="sm" onClick={exportHtml}><Download className="size-4" /></Button>
                  {canEdit && !editing && <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="size-4" /> Edit</Button>}
                  {canDelete && <Button variant="ghost" size="sm" onClick={del}><Trash2 className="size-4" /></Button>}
                </div>
              </div>
            </DialogHeader>

            <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_260px]">
              {/* Content / editor */}
              <div className="overflow-y-auto p-5">
                {editing ? (
                  <div className="space-y-3">
                    <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[340px] font-mono text-sm" />
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed? (optional version note)" />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button onClick={saveEdit} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save new version"}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose-sm max-w-none"><Markdown content={jd.content} /></div>
                )}
              </div>

              {/* Version history */}
              <div className="border-t border-border md:border-l md:border-t-0">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" /> Version history
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {(data?.versions ?? []).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setViewVersion(v)}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Badge variant={v.version === jd.currentVersion ? "default" : "outline"} className="mt-0.5 shrink-0">v{v.version}</Badge>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{v.note || "Edited"}</span>
                        <span className="block text-[11px] text-muted-foreground">{v.createdByName ?? "—"} · {new Date(v.createdAt).toLocaleString()}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Version viewer */}
        {viewVersion && (
          <Dialog open onOpenChange={(o) => !o && setViewVersion(null)}>
            <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Version {viewVersion.version}</DialogTitle>
                <DialogDescription>{viewVersion.note} · {new Date(viewVersion.createdAt).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <div className="prose-sm max-w-none rounded-xl border border-border bg-muted/30 p-4"><Markdown content={viewVersion.content} /></div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setViewVersion(null)}>Close</Button>
                {canEdit && viewVersion.version !== jd?.currentVersion && (
                  <Button onClick={() => restore(viewVersion)} disabled={saving}><RotateCcw className="size-4" /> Restore this version</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
