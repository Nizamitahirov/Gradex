"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayRow, PayScaleParams } from "@/lib/pay/scale";

export interface PayStructure {
  id: string;
  name: string;
  isBase: boolean;
  params: PayScaleParams;
  rows: PayRow[];
  createdAt: number;
}

export function usePayStructures() {
  return useQuery<PayStructure[]>({
    queryKey: ["pay-structures"],
    queryFn: async () => {
      const res = await fetch("/api/pay-structures", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.structures;
    },
  });
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "Request failed");
  return json;
}

export function usePayStructureMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["pay-structures"] });
  return {
    create: useMutation({
      mutationFn: (s: { name: string; isBase?: boolean; params: PayScaleParams; rows: PayRow[] }) =>
        send("/api/pay-structures", "POST", s),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => send(`/api/pay-structures/${id}`, "DELETE"), onSuccess: inv }),
    makeBase: useMutation({ mutationFn: (id: string) => send(`/api/pay-structures/${id}`, "PATCH", { makeBase: true }), onSuccess: inv }),
  };
}
