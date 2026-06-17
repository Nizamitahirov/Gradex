"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const jobs = useAppStore((s) => s.jobs);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Every distinct role in your organization, with its current grade and status."
        action={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4" /> Add job
            </Link>
          </Button>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs graded yet"
          description="Add your first job and run it through the banding + grading wizard."
          action={
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="size-4" /> Add your first job
              </Link>
            </Button>
          }
        />
      ) : (
        <JobsTable jobs={jobs} />
      )}
    </div>
  );
}
