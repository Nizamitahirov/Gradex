"use client";

import { useQuery } from "@tanstack/react-query";
import type { Activity, Evaluation, Family, Job, Org } from "@/types";

export interface OrgData {
  org: Org;
  families: Family[];
  jobs: Job[];
  evaluations: (Evaluation & { jobId: string | null })[];
  activity: Activity[];
}

async function fetchOrgData(): Promise<OrgData | null> {
  const res = await fetch("/api/data", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load data");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load data");
  return json.data;
}

/** Live organization data from Firestore (real, not the local demo store). */
export function useOrgData() {
  return useQuery({
    queryKey: ["org-data"],
    queryFn: fetchOrgData,
    staleTime: 15_000,
  });
}
