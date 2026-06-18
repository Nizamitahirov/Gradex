"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

async function post(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "Request failed");
  return json;
}

function useInvalidating<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-data"] }),
  });
}

export function useCreateFamily() {
  return useInvalidating((data: { name: string; description: string; color?: string }) =>
    post("/api/families", data),
  );
}

export function useDeleteFamily() {
  return useInvalidating((id: string) => post(`/api/families/${id}`, undefined, "DELETE"));
}

export function useCreateJob() {
  return useInvalidating(
    (data: {
      title: string;
      familyId: string;
      code?: string;
      description?: string;
      careerPath?: string;
      band?: string;
      reportsToJobId?: string | null;
    }) => post("/api/jobs", data),
  );
}

export function useDeleteJob() {
  return useInvalidating((id: string) => post(`/api/jobs/${id}`, undefined, "DELETE"));
}

export function useSaveEvaluation() {
  return useInvalidating((args: { jobId: string; payload: Record<string, unknown> }) =>
    post(`/api/jobs/${args.jobId}/evaluation`, args.payload),
  );
}

export function useSaveScoping() {
  return useInvalidating((args: { inputs: unknown; result: unknown }) => post("/api/scoping", args));
}
