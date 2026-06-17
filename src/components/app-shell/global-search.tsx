"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, FolderTree, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";
import { GradeBadge } from "@/components/grade-badge";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const jobs = useAppStore((s) => s.jobs);
  const families = useAppStore((s) => s.families);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const ql = q.trim().toLowerCase();
  const jobMatches = ql
    ? jobs.filter((j) => j.title.toLowerCase().includes(ql)).slice(0, 6)
    : jobs.slice(0, 5);
  const familyMatches = ql
    ? families.filter((f) => f.name.toLowerCase().includes(ql)).slice(0, 4)
    : [];

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs and families…"
            className="h-12 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {jobMatches.length === 0 && familyMatches.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">No results.</p>
          )}
          {jobMatches.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Jobs</p>
              {jobMatches.map((j) => (
                <button
                  key={j.id}
                  onClick={() => go(`/jobs/${j.id}`)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Briefcase className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{j.title}</span>
                  <GradeBadge grade={j.currentGrade} size="sm" />
                </button>
              ))}
            </div>
          )}
          {familyMatches.length > 0 && (
            <div>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Families</p>
              {familyMatches.map((f) => (
                <button
                  key={f.id}
                  onClick={() => go(`/families/${f.id}`)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <FolderTree className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
