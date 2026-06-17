/**
 * Scoring engine — SPEC.md §9.
 *
 * Gradex's original model that turns factor answers into a global grade 1–25.
 * Pure & framework-agnostic: no UI, no Firestore. Fully unit-tested so the
 * business logic can be tuned without touching the app.
 */

import {
  DEFAULT_WEIGHTS,
  FACTORS,
  FACTOR_IDS,
  FACTOR_MAP,
  type FactorId,
} from "./factors";
import { candidateWindow, type BandKey, type CareerPath, getBand } from "./bands";

export type FactorSelections = Partial<Record<FactorId, number>>;
export type FactorWeights = Record<FactorId, number>;
export type Confidence = "high" | "medium" | "low";

export interface FactorBreakdown {
  id: FactorId;
  name: string;
  levelIndex: number;
  levelLabel: string;
  score: number;
  weight: number;
  weightedScore: number;
}

export interface GradingInput {
  selections: FactorSelections;
  band: BandKey;
  careerPath: CareerPath;
  /** The org's scoped used-grade range (from §6). */
  scopedRange: { lo: number; hi: number };
  weights?: Partial<FactorWeights>;
}

export interface GradingResult {
  /** Per-factor explainability rows. */
  breakdown: FactorBreakdown[];
  factorScores: Record<FactorId, number>;
  rawScore: number;
  rMax: number;
  /** Grade from the raw→grade mapping, before any constraint. */
  computedGrade: number;
  /** Grade after clamping to the org's scoped range. */
  finalGrade: number;
  bandWindow: { lo: number; hi: number };
  anomaly: boolean;
  confidence: Confidence;
  flags: string[];
  complete: boolean;
}

const GRADE_SCALE_MAX = 25;

/** Maximum achievable weighted raw score for the given weights (computed, not hard-coded). */
export function computeRMax(weights: FactorWeights): number {
  return FACTORS.reduce((sum, f) => {
    const maxLevel = f.levels[f.levels.length - 1];
    return sum + maxLevel.score * (weights[f.id] ?? 1);
  }, 0);
}

function resolveWeights(partial?: Partial<FactorWeights>): FactorWeights {
  return { ...DEFAULT_WEIGHTS, ...partial };
}

/** Map a raw score onto the 1–25 grade scale (§9.3), monotonic. */
export function rawToGrade(raw: number, rMax: number): number {
  if (rMax <= 0) return 1;
  const g = 1 + (raw / rMax) * (GRADE_SCALE_MAX - 1);
  return Math.min(GRADE_SCALE_MAX, Math.max(1, Math.round(g)));
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Consistency / sanity checks (§9.5). These WARN, never block.
 * `reportsToLeadership` is the Leadership level of the job this one reports to,
 * if known, for the manager-vs-report check.
 */
function consistencyFlags(
  selections: FactorSelections,
  careerPath: CareerPath,
  reportsToLeadership?: number,
): string[] {
  const flags: string[] = [];
  const leadership = selections.leadership;
  const fk = selections.functionalKnowledge;
  const ps = selections.problemSolving;
  const leadershipMaxIdx = FACTOR_MAP.leadership.levels.length - 1;

  if (careerPath === "IC" && leadership !== undefined && leadership >= leadershipMaxIdx - 1) {
    flags.push(
      "High Leadership selected on an Individual Contributor — this job may be mis-pathed to Management.",
    );
  }
  if (fk !== undefined && ps !== undefined && Math.abs(fk - ps) >= 3) {
    flags.push(
      "Functional Knowledge and Problem Solving differ by a wide margin — verify both selections are coherent.",
    );
  }
  if (
    reportsToLeadership !== undefined &&
    leadership !== undefined &&
    leadership < reportsToLeadership
  ) {
    flags.push(
      "This job's Leadership level is lower than the job it reports to — review the reporting relationship.",
    );
  }
  return flags;
}

function confidenceFor(
  finalGrade: number,
  window: { lo: number; hi: number },
  anomaly: boolean,
  consistencyCount: number,
): Confidence {
  if (anomaly) return "low";
  if (consistencyCount > 0) return "medium";
  const span = window.hi - window.lo;
  if (span <= 0) return "high";
  // How centered is the grade within the band window? (0 = edge, 1 = dead center)
  const center = window.lo + span / 2;
  const centeredness = 1 - Math.abs(finalGrade - center) / (span / 2);
  if (centeredness >= 0.4) return "high";
  return "medium";
}

export function gradeJob(input: GradingInput, reportsToLeadership?: number): GradingResult {
  const weights = resolveWeights(input.weights);
  const rMax = computeRMax(weights);

  const breakdown: FactorBreakdown[] = [];
  const factorScores = {} as Record<FactorId, number>;
  let rawScore = 0;
  let complete = true;

  for (const id of FACTOR_IDS) {
    const def = FACTOR_MAP[id];
    const levelIndex = input.selections[id];
    if (levelIndex === undefined || levelIndex < 0 || levelIndex >= def.levels.length) {
      complete = false;
      factorScores[id] = 0;
      breakdown.push({
        id,
        name: def.name,
        levelIndex: -1,
        levelLabel: "Not answered",
        score: 0,
        weight: weights[id],
        weightedScore: 0,
      });
      continue;
    }
    const level = def.levels[levelIndex];
    const weighted = level.score * weights[id];
    factorScores[id] = level.score;
    rawScore += weighted;
    breakdown.push({
      id,
      name: def.name,
      levelIndex,
      levelLabel: level.label,
      score: level.score,
      weight: weights[id],
      weightedScore: weighted,
    });
  }

  const computedGrade = rawToGrade(rawScore, rMax);
  const finalGrade = clamp(computedGrade, input.scopedRange.lo, input.scopedRange.hi);
  const bandWindow = candidateWindow(input.band, input.scopedRange);

  const outsideBand = finalGrade < bandWindow.lo || finalGrade > bandWindow.hi;
  const bandPath = getBand(input.band).path;
  const pathMismatch = bandPath !== input.careerPath;

  const flags: string[] = [];
  if (outsideBand) {
    const dir = finalGrade > bandWindow.hi ? "above" : "below";
    flags.push(
      `Computed grade ${finalGrade} is ${dir} the ${getBand(input.band).name} band's expected range ${bandWindow.lo}–${bandWindow.hi}; review the band selection or factor answers.`,
    );
  }
  if (pathMismatch) {
    flags.push(
      `The ${getBand(input.band).name} band sits on the ${bandPath === "M" ? "Management" : "Individual Contributor"} path, but this job is set to ${input.careerPath === "M" ? "Management" : "Individual Contributor"}.`,
    );
  }
  const checks = consistencyFlags(input.selections, input.careerPath, reportsToLeadership);
  flags.push(...checks);

  const anomaly = outsideBand || pathMismatch;
  const confidence = confidenceFor(finalGrade, bandWindow, anomaly, checks.length);

  return {
    breakdown,
    factorScores,
    rawScore: Math.round(rawScore * 100) / 100,
    rMax,
    computedGrade,
    finalGrade,
    bandWindow,
    anomaly,
    confidence,
    flags,
    complete,
  };
}
