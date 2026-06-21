"use client";

import * as React from "react";
import Link from "next/link";
import { FolderTree, Plus, Network, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useOrgData } from "@/hooks/use-org-data";
import { useAuth } from "@/contexts/auth-context";
import { useCreateFamily } from "@/hooks/use-mutations";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GradeBadge } from "@/components/grade-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PALETTE = ["#6E56CF", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#14B8A6", "#EF4444"];
const ALL = "all";

export default function FamiliesPage() {
  const { data, isLoading } = useOrgData();
  const { can } = useAuth();
  const canCreate = can("families", "create");
  const createFamily = useCreateFamily();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(PALETTE[0]);
  const [q, setQ] = React.useState("");
  const [company, setCompany] = React.useState(ALL);

  const families = React.useMemo(() => data?.families ?? [], [data]);
  // Company filter is meaningful in the aggregated "All companies" scope.
  const companies = React.useMemo(
    () => [...new Set(families.map((f) => f.orgName).filter(Boolean) as string[])].sort(),
    [families],
  );

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createFamily.mutateAsync({ name: name.trim(), description: description.trim(), color });
      toast.success(`Department "${name.trim()}" created`);
      setName(""); setDescription(""); setColor(PALETTE[0]); setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const stats = (familyId: string) => {
    const fjobs = (data?.jobs ?? []).filter((j) => j.familyId === familyId);
    const grades = fjobs.filter((j) => j.currentGrade != null).map((j) => j.currentGrade!) as number[];
    return { count: fjobs.length, min: grades.length ? Math.min(...grades) : null, max: grades.length ? Math.max(...grades) : null };
  };

  const filtered = families.filter((f) => {
    if (company !== ALL && f.orgName !== company) return false;
    if (q.trim() && !f.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Group related jobs into departments. For the full Company → Department → Section → Division → Unit structure and org chart, open Organization."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/organization"><Network className="size-4" /> Org structure</Link></Button>
            {canCreate && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New department</Button>}
          </div>
        }
      />

      {/* Filters */}
      {families.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search departments…" className="pl-9" />
          </div>
          {companies.length > 1 && (
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All companies</SelectItem>
                {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="ml-auto text-xs text-muted-foreground tnum">{filtered.length} of {families.length}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : families.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No departments yet"
          description="Create your first department — for example Engineering, Finance or Sales."
          action={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New department</Button> : undefined}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No departments match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const st = stats(f.id);
            const c = f.color ?? "var(--primary)";
            return (
              <Link key={f.id} href={`/families/${f.id}`} className="group">
                <Card className="relative h-full overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: c }} />
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}
                      >
                        {f.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold leading-tight group-hover:text-primary">{f.name}</h3>
                        {f.orgName && <p className="truncate text-[11px] text-muted-foreground">{f.orgName}</p>}
                      </div>
                    </div>
                    <p className={cn("mt-3 line-clamp-2 text-sm text-muted-foreground", !f.description && "italic opacity-60")}>
                      {f.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <Briefcase className="size-3.5" /> <span className="tnum">{st.count}</span> jobs
                      </span>
                      {st.min != null && st.max != null ? (
                        <div className="flex items-center gap-1">
                          <GradeBadge grade={st.min} size="sm" />
                          {st.min !== st.max && <><span className="text-xs text-muted-foreground">–</span><GradeBadge grade={st.max} size="sm" /></>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not graded</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New department</DialogTitle>
            <DialogDescription>Departments group related jobs for analysis and comparison.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fname">Name</Label>
              <Input id="fname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fdesc">Description</Label>
              <Textarea id="fdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this department do?" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PALETTE.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className="size-7 rounded-full ring-offset-2 ring-offset-background transition-all"
                    style={{ background: col, outline: color === col ? "2px solid var(--ring)" : "none" }}
                    aria-label={`Color ${col}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={createFamily.isPending}>
              {createFamily.isPending ? "Creating…" : "Create department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
