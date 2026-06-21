"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrgUnit, StructureMode } from "@/lib/org/structure";

async function api(url: string, method = "POST", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "Request failed");
  return json;
}

export function useOrgUnits() {
  return useQuery<{ units: OrgUnit[]; structureMode: StructureMode }>({
    queryKey: ["org-units"],
    queryFn: async () => {
      const json = await api("/api/org-units", "GET");
      return { units: json.units ?? [], structureMode: (json.structureMode ?? "functional") as StructureMode };
    },
    staleTime: 10_000,
  });
}

export function useOrgUnitMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["org-units"] });

  const create = useMutation({ mutationFn: (u: Partial<OrgUnit>) => api("/api/org-units", "POST", u), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, ...u }: Partial<OrgUnit> & { id: string }) => api(`/api/org-units/${id}`, "PATCH", u), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api(`/api/org-units/${id}`, "DELETE"), onSuccess: invalidate });
  const setMode = useMutation({ mutationFn: (structureMode: StructureMode) => api("/api/org-units", "PATCH", { structureMode }), onSuccess: invalidate });

  return { create, update, remove, setMode };
}
