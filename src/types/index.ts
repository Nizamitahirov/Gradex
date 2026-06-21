/**
 * Domain types & Zod schemas — SPEC.md §10 (Firestore data model) & §18.
 * Zod schemas double as runtime validation and the source of TS types.
 */

import { z } from "zod";
import { BAND_KEYS } from "@/lib/grading/bands";
import { FACTOR_IDS } from "@/lib/grading/factors";

export const roleSchema = z.enum(["admin", "analyst", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

export const careerPathSchema = z.enum(["IC", "M"]);
export const bandKeySchema = z.enum(BAND_KEYS as [string, ...string[]]);
export const jobStatusSchema = z.enum(["draft", "graded", "needs_review"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const scopingInputsSchema = z.object({
  revenueMillions: z.number().nonnegative(),
  currency: z.string().default("USD"),
  fteEmployees: z.number().int().nonnegative(),
  geographicBreadth: z.enum(["domestic", "international", "global"]),
  diversityComplexity: z.enum(["low", "medium", "high"]),
  industry: z.string().optional(),
});
export type ScopingInputsT = z.infer<typeof scopingInputsSchema>;

export const scopingResultSchema = z.object({
  revenueGrade: z.number().int().min(16).max(25),
  fteGrade: z.number().int().min(16).max(25),
  dcGeoGrade: z.number().int().min(16).max(25),
  companyGrade: z.number().int().min(16).max(25),
  ceoGrade: z.number().int().min(16).max(25),
  topGrade: z.number().int().min(1).max(25),
  bottomGrade: z.number().int().min(1).max(25),
  usedGrades: z.array(z.number().int()),
  businessSize: z.enum(["small", "medium", "large"]),
});

export const orgSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string(),
  logoURL: z.string().nullable().optional(),
  industry: z.string(),
  currency: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  scoping: z
    .object({
      inputs: scopingInputsSchema,
      result: scopingResultSchema,
      completed: z.boolean(),
      completedAt: z.number().nullable(),
    })
    .nullable()
    .optional(),
});
export type Org = z.infer<typeof orgSchema>;

export const familySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  key: z.string(),
  description: z.string().default(""),
  color: z.string().optional(),
  jobCount: z.number().int().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Family = z.infer<typeof familySchema>;

export const factorSelectionsSchema = z.object(
  Object.fromEntries(FACTOR_IDS.map((id) => [id, z.number().int().nullable()])) as Record<
    string,
    z.ZodNullable<z.ZodNumber>
  >,
);

export const evaluationSchema = z.object({
  id: z.string(),
  factorSelections: z.record(z.string(), z.number().int()),
  factorScores: z.record(z.string(), z.number()),
  rawScore: z.number(),
  rMax: z.number(),
  computedGrade: z.number().int(),
  finalGrade: z.number().int().min(1).max(25),
  bandWindow: z.object({ lo: z.number().int(), hi: z.number().int() }),
  anomaly: z.boolean(),
  flags: z.array(z.string()),
  confidence: confidenceSchema,
  breakdown: z.array(z.any()),
  gradedBy: z.string(),
  gradedByName: z.string().optional(),
  gradedAt: z.number(),
  note: z.string().optional(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;

export const jobSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  code: z.string().optional(),
  familyId: z.string(),
  section: z.string().optional(),
  division: z.string().optional(),
  unit: z.string().optional(),
  careerPath: careerPathSchema,
  band: bandKeySchema,
  description: z.string().default(""),
  jobPurpose: z.string().optional(),
  jd: z.string().optional(),
  source: z.string().optional(),
  reportsToJobId: z.string().nullable().optional(),
  currentGrade: z.number().int().min(1).max(25).nullable(),
  currentEvaluationId: z.string().nullable(),
  confidence: confidenceSchema.nullable(),
  flags: z.array(z.string()).default([]),
  status: jobStatusSchema,
  createdBy: z.string(),
  createdAt: z.number(),
  updatedBy: z.string().optional(),
  updatedAt: z.number(),
});
export type Job = z.infer<typeof jobSchema>;

export const memberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: roleSchema,
  invitedBy: z.string().optional(),
  joinedAt: z.number(),
  status: z.enum(["active", "invited"]),
});
export type Member = z.infer<typeof memberSchema>;

export const activitySchema = z.object({
  id: z.string(),
  type: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  summary: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.number(),
});
export type Activity = z.infer<typeof activitySchema>;

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}
