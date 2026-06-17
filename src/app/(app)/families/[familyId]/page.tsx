"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { JobsTable } from "@/components/jobs-table";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";

export default function FamilyDetailPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const router = useRouter();
  const family = useAppStore((s) => s.families.find((f) => f.id === familyId));
  const jobs = useAppStore((s) => s.jobs.filter((j) => j.familyId === familyId));

  if (!family) {
    return (
      <EmptyState
        title="Family not found"
        description="This family may have been deleted."
        action={
          <Button onClick={() => router.push("/families")}>
            <ArrowLeft className="size-4" /> Back to families
          </Button>
        }
      />
    );
  }

  const graded = jobs.filter((j) => j.currentGrade != null).map((j) => j.currentGrade!) as number[];
  const avg = graded.length ? Math.round((graded.reduce((a, b) => a + b, 0) / graded.length) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push("/families")}>
        <ArrowLeft className="size-4" /> Families
      </Button>
      <PageHeader
        title={family.name}
        description={family.description || "Jobs in this family."}
        action={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4" /> Add job
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Jobs" value={jobs.length} icon={Briefcase} />
        <StatCard label="Average grade" value={avg || "—"} />
        <StatCard
          label="Grade spread"
          value={graded.length ? `${Math.min(...graded)}–${Math.max(...graded)}` : "—"}
        />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs in this family"
          description="Add a job and assign it to this family."
          action={
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="size-4" /> Add job
              </Link>
            </Button>
          }
        />
      ) : (
        <JobsTable jobs={jobs} hideFamilyFilter />
      )}
    </div>
  );
}
