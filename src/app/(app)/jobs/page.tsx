"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Plus, Sparkles, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useOrgData } from "@/hooks/use-org-data";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsPage() {
  const { data, isLoading } = useOrgData();
  const { can } = useAuth();
  const [exporting, setExporting] = React.useState(false);
  const canCreate = can("jobs", "create");

  const exportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { exportJobsToExcel } = await import("@/lib/export/excel");
      await exportJobsToExcel(data.jobs, data.families, data.evaluations, data.org.name);
      toast.success("Exported to Excel.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Every distinct role in your organization, with its current grade and status."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={exporting || !data?.jobs.length}>
              <FileSpreadsheet className="size-4" /> {exporting ? "Exporting…" : "Export to Excel"}
            </Button>
            {canCreate && (
              <>
                <Button variant="secondary" asChild>
                  <Link href="/jobs/bulk">
                    <Sparkles className="size-4" /> Bulk AI grade
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/jobs/new">
                    <Plus className="size-4" /> Add job
                  </Link>
                </Button>
              </>
            )}
          </div>
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
            canCreate ? (
              <Button asChild>
                <Link href="/jobs/new">
                  <Plus className="size-4" /> Add your first job
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <JobsTable jobs={data.jobs} families={data.families} />
      )}
    </div>
  );
}
