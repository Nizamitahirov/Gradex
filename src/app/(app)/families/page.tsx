"use client";

import * as React from "react";
import Link from "next/link";
import { FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrgData } from "@/hooks/use-org-data";
import { useAuth } from "@/contexts/auth-context";
import { useCreateFamily } from "@/hooks/use-mutations";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { GradeBadge } from "@/components/grade-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PALETTE = ["#6E56CF", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#14B8A6", "#EF4444"];

export default function FamiliesPage() {
  const { data, isLoading } = useOrgData();
  const { can } = useAuth();
  const canCreate = can("families", "create");
  const createFamily = useCreateFamily();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(PALETTE[0]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createFamily.mutateAsync({ name: name.trim(), description: description.trim(), color });
      toast.success(`Family "${name.trim()}" created`);
      setName("");
      setDescription("");
      setColor(PALETTE[0]);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const stats = (familyId: string) => {
    const fjobs = (data?.jobs ?? []).filter((j) => j.familyId === familyId);
    const grades = fjobs.filter((j) => j.currentGrade != null).map((j) => j.currentGrade!) as number[];
    return { count: fjobs.length, min: grades.length ? Math.min(...grades) : null, max: grades.length ? Math.max(...grades) : null };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job families"
        description="Group related jobs into functions for organization, filtering and comparison."
        action={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New family</Button> : undefined}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : !data || data.families.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No families yet"
          description="Create your first job family — for example Engineering, Finance or Sales."
          action={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New family</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.families.map((f) => {
            const st = stats(f.id);
            return (
              <Link key={f.id} href={`/families/${f.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="size-3 rounded-full" style={{ background: f.color ?? "var(--primary)" }} />
                      <h3 className="flex-1 truncate font-medium">{f.name}</h3>
                    </div>
                    {f.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{f.description}</p>}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground tnum">{st.count} jobs</span>
                      {st.min != null && st.max != null && (
                        <div className="flex items-center gap-1">
                          <GradeBadge grade={st.min} size="sm" />
                          <span className="text-xs text-muted-foreground">–</span>
                          <GradeBadge grade={st.max} size="sm" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New job family</DialogTitle>
            <DialogDescription>Families group related jobs for analysis and comparison.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fname">Name</Label>
              <Input id="fname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fdesc">Description</Label>
              <Textarea id="fdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this function do?" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="size-7 rounded-full ring-offset-2 ring-offset-background transition-all"
                    style={{ background: c, outline: color === c ? "2px solid var(--ring)" : "none" }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={createFamily.isPending}>
              {createFamily.isPending ? "Creating…" : "Create family"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
