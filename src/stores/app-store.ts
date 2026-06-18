"use client";

/**
 * App data store (SPEC.md §3 state layer).
 *
 * This is Gradex's client data layer. It persists to localStorage so data
 * survives refresh (success criterion §2.3) and the app is fully usable
 * without Firebase credentials. The shape mirrors the Firestore model (§10);
 * when Firebase is configured the same actions can be backed by Firestore.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Activity, Evaluation, Family, Job, Member, Org } from "@/types";
import type { ScopingInputsT } from "@/types";
import type { ScopingResult } from "@/lib/scoping";
import { buildSeed, DEMO_USER } from "@/lib/demo/seed";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

interface AppState {
  initialized: boolean;
  currentOrgId: string | null;
  orgs: Org[];
  families: Family[];
  jobs: Job[];
  evaluations: Evaluation[];
  members: Member[];
  activity: Activity[];

  // lifecycle
  ensureSeeded: () => void;
  resetDemo: () => void;
  setCurrentOrg: (orgId: string) => void;

  // selectors
  currentOrg: () => Org | undefined;

  // scoping
  saveScoping: (orgId: string, inputs: ScopingInputsT, result: ScopingResult) => void;

  // families
  addFamily: (orgId: string, data: { name: string; description: string; color?: string }) => Family;
  updateFamily: (id: string, data: Partial<Family>) => void;
  deleteFamily: (id: string) => void;

  // jobs
  addJob: (
    orgId: string,
    data: Pick<Job, "title" | "familyId" | "description" | "careerPath" | "band"> &
      Partial<Pick<Job, "code" | "reportsToJobId">>,
  ) => Job;
  updateJob: (id: string, data: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  // evaluations
  saveEvaluation: (
    jobId: string,
    evaluation: Omit<Evaluation, "id" | "gradedAt" | "gradedBy" | "gradedByName">,
    jobPatch: Partial<Job>,
  ) => Evaluation;

  // activity
  logActivity: (a: Omit<Activity, "id" | "createdAt" | "actorId" | "actorName">) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      initialized: false,
      currentOrgId: null,
      orgs: [],
      families: [],
      jobs: [],
      evaluations: [],
      members: [],
      activity: [],

      ensureSeeded: () => {
        if (get().initialized) return;
        const seed = buildSeed();
        set({
          initialized: true,
          currentOrgId: seed.org.id,
          orgs: [seed.org],
          families: seed.families,
          jobs: seed.jobs,
          evaluations: seed.evaluations,
          members: seed.members,
          activity: seed.activity,
        });
      },

      resetDemo: () => {
        const seed = buildSeed();
        set({
          initialized: true,
          currentOrgId: seed.org.id,
          orgs: [seed.org],
          families: seed.families,
          jobs: seed.jobs,
          evaluations: seed.evaluations,
          members: seed.members,
          activity: seed.activity,
        });
      },

      setCurrentOrg: (orgId) => set({ currentOrgId: orgId }),

      currentOrg: () => get().orgs.find((o) => o.id === get().currentOrgId),

      saveScoping: (orgId, inputs, result) => {
        set((s) => ({
          orgs: s.orgs.map((o) =>
            o.id === orgId
              ? {
                  ...o,
                  updatedAt: Date.now(),
                  scoping: { inputs, result, completed: true, completedAt: Date.now() },
                }
              : o,
          ),
        }));
        get().logActivity({
          type: "scoping_completed",
          summary: `Updated scoping — grades ${result.bottomGrade}–${result.topGrade}, CEO at ${result.topGrade}`,
        });
      },

      addFamily: (orgId, data) => {
        const fam: Family = {
          id: uid("fam"),
          name: data.name,
          key: data.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
          description: data.description,
          color: data.color,
          jobCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ families: [...s.families, fam] }));
        get().logActivity({
          type: "family_created",
          targetType: "family",
          targetId: fam.id,
          summary: `Created family "${fam.name}"`,
        });
        return fam;
      },

      updateFamily: (id, data) =>
        set((s) => ({
          families: s.families.map((f) =>
            f.id === id ? { ...f, ...data, updatedAt: Date.now() } : f,
          ),
        })),

      deleteFamily: (id) =>
        set((s) => ({
          families: s.families.filter((f) => f.id !== id),
          jobs: s.jobs.filter((j) => j.familyId !== id),
        })),

      addJob: (orgId, data) => {
        const job: Job = {
          id: uid("job"),
          title: data.title,
          code: data.code,
          familyId: data.familyId,
          careerPath: data.careerPath,
          band: data.band,
          description: data.description ?? "",
          reportsToJobId: data.reportsToJobId ?? null,
          currentGrade: null,
          currentEvaluationId: null,
          confidence: null,
          flags: [],
          status: "draft",
          createdBy: DEMO_USER.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          jobs: [...s.jobs, job],
          families: s.families.map((f) =>
            f.id === data.familyId ? { ...f, jobCount: f.jobCount + 1 } : f,
          ),
        }));
        get().logActivity({
          type: "job_created",
          targetType: "job",
          targetId: job.id,
          summary: `Added job "${job.title}"`,
        });
        return job;
      },

      updateJob: (id, data) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data, updatedAt: Date.now() } : j)),
        })),

      deleteJob: (id) =>
        set((s) => {
          const job = s.jobs.find((j) => j.id === id);
          return {
            jobs: s.jobs.filter((j) => j.id !== id),
            evaluations: s.evaluations.filter((e) => !e.id.startsWith(`${id}:`)),
            families: job
              ? s.families.map((f) =>
                  f.id === job.familyId ? { ...f, jobCount: Math.max(0, f.jobCount - 1) } : f,
                )
              : s.families,
          };
        }),

      saveEvaluation: (jobId, evaluation, jobPatch) => {
        const wasGraded = get().jobs.find((j) => j.id === jobId)?.currentGrade != null;
        const full: Evaluation = {
          ...evaluation,
          id: `${jobId}:${uid("eval")}`,
          gradedBy: DEMO_USER.uid,
          gradedByName: DEMO_USER.displayName,
          gradedAt: Date.now(),
        };
        set((s) => ({
          evaluations: [...s.evaluations, full],
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, ...jobPatch, currentEvaluationId: full.id, updatedAt: Date.now() }
              : j,
          ),
        }));
        const job = get().jobs.find((j) => j.id === jobId);
        get().logActivity({
          type: wasGraded ? "job_regraded" : "job_graded",
          targetType: "job",
          targetId: jobId,
          summary: `${wasGraded ? "Re-graded" : "Graded"} "${job?.title}" at grade ${full.finalGrade}`,
        });
        return full;
      },

      logActivity: (a) =>
        set((s) => ({
          activity: [
            {
              ...a,
              id: uid("act"),
              actorId: DEMO_USER.uid,
              actorName: DEMO_USER.displayName,
              createdAt: Date.now(),
            },
            ...s.activity,
          ].slice(0, 200),
        })),
    }),
    {
      name: "gradex-store-v2",
    },
  ),
);

// Convenience selectors (used across pages)
export function useCurrentOrg() {
  return useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
}
