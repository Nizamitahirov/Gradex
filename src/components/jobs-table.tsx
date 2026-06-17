"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { GradeBadge } from "@/components/grade-badge";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBand } from "@/lib/grading/bands";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

type SortKey = "title" | "grade" | "band" | "status";

const STATUS_LABEL: Record<Job["status"], string> = {
  draft: "Draft",
  graded: "Graded",
  needs_review: "Needs review",
};

export function JobsTable({ jobs, hideFamilyFilter = false }: { jobs: Job[]; hideFamilyFilter?: boolean }) {
  const families = useAppStore((s) => s.families);
  const router = useRouter();

  const [q, setQ] = React.useState("");
  const [familyId, setFamilyId] = React.useState("all");
  const [path, setPath] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("grade");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");

  const familyMap = React.useMemo(
    () => Object.fromEntries(families.map((f) => [f.id, f])),
    [families],
  );

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    const rows = jobs.filter((j) => {
      if (ql && !j.title.toLowerCase().includes(ql)) return false;
      if (familyId !== "all" && j.familyId !== familyId) return false;
      if (path !== "all" && j.careerPath !== path) return false;
      if (status !== "all" && j.status !== status) return false;
      return true;
    });
    const mult = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title) * mult;
        case "grade":
          return ((a.currentGrade ?? -1) - (b.currentGrade ?? -1)) * mult;
        case "band":
          return getBand(a.band as never).name.localeCompare(getBand(b.band as never).name) * mult;
        case "status":
          return a.status.localeCompare(b.status) * mult;
      }
    });
  }, [jobs, q, familyId, path, status, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "title" ? "asc" : "desc");
    }
  };

  const sortHead = (k: SortKey, label: string, className?: string) => (
    <th className={cn("px-3 py-2 text-left font-medium", className)}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label} <ArrowUpDown className="size-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jobs…"
          className="sm:max-w-xs"
        />
        {!hideFamilyFilter && (
          <Select value={familyId} onValueChange={setFamilyId}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All families</SelectItem>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={path} onValueChange={setPath}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Path" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All paths</SelectItem>
            <SelectItem value="IC">Individual Contributor</SelectItem>
            <SelectItem value="M">Management</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
            <SelectItem value="needs_review">Needs review</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {sortHead("grade", "Grade", "w-20")}
                {sortHead("title", "Title")}
                <th className="px-3 py-2 text-left font-medium">Family</th>
                {sortHead("band", "Band")}
                <th className="px-3 py-2 text-left font-medium">Confidence</th>
                {sortHead("status", "Status")}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const fam = familyMap[j.familyId];
                return (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/jobs/${j.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-accent/50"
                  >
                    <td className="px-3 py-2.5">
                      <GradeBadge grade={j.currentGrade} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 font-medium">{j.title}</td>
                    <td className="px-3 py-2.5">
                      {fam && (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full" style={{ background: fam.color ?? "var(--primary)" }} />
                          {fam.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{getBand(j.band as never).name}</td>
                    <td className="px-3 py-2.5">
                      <ConfidenceBadge confidence={j.confidence} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          j.status === "graded" ? "success" : j.status === "needs_review" ? "warning" : "secondary"
                        }
                      >
                        {STATUS_LABEL[j.status]}
                      </Badge>
                    </td>
                    <td className="px-2 text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No jobs match your filters.</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground tnum">{filtered.length} of {jobs.length} jobs</p>
    </div>
  );
}
