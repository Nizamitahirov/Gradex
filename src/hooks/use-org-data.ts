"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Activity, Evaluation, Family, Job, Org } from "@/types";

export interface Company {
  id: string;
  name: string;
}

export interface OrgData {
  org: Org & { scopeAll?: boolean; companyCount?: number };
  families: (Family & { orgId?: string; orgName?: string })[];
  jobs: (Job & { orgId?: string; orgName?: string })[];
  evaluations: (Evaluation & { jobId: string | null; orgId?: string })[];
  activity: Activity[];
}

interface OrgDataPayload {
  data: OrgData | null;
  companies: Company[];
  scope: string | null;
}

const COMPANY_COOKIE = "gradex_company";

async function fetchOrgData(): Promise<OrgDataPayload> {
  const res = await fetch("/api/data", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load data");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load data");
  return { data: json.data, companies: json.companies ?? [], scope: json.scope ?? null };
}

/** Live data for the active company (real Firestore, not the demo store). */
export function useOrgData() {
  return useQuery({
    queryKey: ["org-data"],
    queryFn: fetchOrgData,
    staleTime: 15_000,
    select: (payload) => payload.data,
  });
}

/** The companies the user can switch between, plus the active scope. */
export function useCompanyScope() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["org-data"],
    queryFn: fetchOrgData,
    staleTime: 15_000,
    select: (payload) => ({ companies: payload.companies, scope: payload.scope }),
  });

  const setActiveCompany = useCallback(
    (id: string) => {
      document.cookie = `${COMPANY_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 7}`;
      // Refetch everything for the newly-selected company.
      qc.invalidateQueries();
    },
    [qc],
  );

  return { ...query, setActiveCompany };
}
