"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsPage() {
  const { data, isLoading } = useOrgData();

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
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : !data || data.jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
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
        <JobsTable jobs={data.jobs} families={data.families} />
      )}
    </div>
  );
}
