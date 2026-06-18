/**
 * GGS Step 3 — scoring engine. See docs/GGS_MODEL.md.
 *
 * Banding sets the grade window; the seven factors place the job within that
 * window. WTW's exact per-grade weights are proprietary (software-delivered),
 * so Gradex uses a transparent, documented placement: the normalized average of
 * the chosen factor levels maps across the band's grade window, then is
 * reconciled to the organization's scoped range. Pure & unit-tested.
 */

import { DEFAULT_WEIGHTS, FACTORS, FACTOR_IDS, FACTOR_MAP, type FactorId } from "./factors";
import {
  candidateWindow,
  getBand,
  is5FSAvailable,
  type BandKey,
  type CareerPath,
} from "./bands";

export type FactorSelections = Partial<Record<FactorId, number>>;
export type FactorWeights = Record<FactorId, number>;
export type Confidence = "high" | "medium" | "low";

export interface FactorBreakdown {
  id: FactorId;
  name: string;
  levelIndex: number;
  levelLabel: string;
  /** Max level index for this factor. */
  maxIndex: number;
  score: number;
  weight: number;
  weightedScore: number;
}

export interface GradingInput {
  selections: FactorSelections;
  band: BandKey;
  careerPath: CareerPath;
  /** Org's scoped used-grade range. */
  scopedRange: { lo: number; hi: number };
  /** Company (CEO) grade — drives the band grade window. */
  companyGrade: number;
  weights?: Partial<FactorWeights>;
}

export interface GradingResult {
  breakdown: FactorBreakdown[];
  factorScores: Record<FactorId, number>;
  rawScore: number;
  rMax: number;
  computedGrade: number;
  finalGrade: number;
  bandWindow: { lo: number; hi: number };
  anomaly: boolean;
  confidence: Confidence;
  flags: string[];
  complete: boolean;
}

function resolveWeights(partial?: Partial<FactorWeights>): FactorWeights {
  return { ...DEFAULT_WEIGHTS, ...partial };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function consistencyFlags(selections: FactorSelections, careerPath: CareerPath): string[] {
  const flags: string[] = [];
  const leadership = selections.leadership;
  const fk = selections.functionalKnowledge;
  const ps = selections.problemSolving;
  const leadershipMax = FACTOR_MAP.leadership.levels.length - 1;

  if (careerPath === "IC" && leadership !== undefined && leadership >= leadershipMax - 1) {
    flags.push("High Leadership on an Individual Contributor — the job may belong on the Management path.");
  }
  if (fk !== undefined && ps !== undefined && Math.abs(fk - ps) >= 3) {
    flags.push("Functional Knowledge and Problem Solving differ widely — verify both selections are coherent.");
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
  const center = window.lo + span / 2;
  const centeredness = 1 - Math.abs(finalGrade - center) / (span / 2);
  return centeredness >= 0.34 ? "high" : "medium";
}

export function gradeJob(input: GradingInput): GradingResult {
  const weights = resolveWeights(input.weights);

  const breakdown: FactorBreakdown[] = [];
  const factorScores = {} as Record<FactorId, number>;
  let rawScore = 0;
  let rMax = 0;
  let weightedNorm = 0;
  let weightSum = 0;
  let complete = true;

  for (const id of FACTOR_IDS) {
    const def = FACTOR_MAP[id];
    const maxIndex = def.levels.length - 1;
    const w = weights[id];
    rMax += maxIndex * w;
    const levelIndex = input.selections[id];

    if (levelIndex === undefined || levelIndex < 0 || levelIndex > maxIndex) {
      complete = false;
      factorScores[id] = 0;
      breakdown.push({ id, name: def.name, levelIndex: -1, levelLabel: "Not answered", maxIndex, score: 0, weight: w, weightedScore: 0 });
      continue;
    }
    const level = def.levels[levelIndex];
    factorScores[id] = level.score;
    rawScore += level.score * w;
    weightedNorm += (levelIndex / maxIndex) * w;
    weightSum += w;
    breakdown.push({
      id,
      name: def.name,
      levelIndex,
      levelLabel: level.label,
      maxIndex,
      score: level.score,
      weight: w,
      weightedScore: level.score * w,
    });
  }

  const bandWindow = candidateWindow(input.band, input.scopedRange, input.companyGrade);
  const overall = weightSum > 0 ? weightedNorm / weightSum : 0; // 0..1
  const computedGrade = Math.round(bandWindow.lo + overall * (bandWindow.hi - bandWindow.lo));
  const finalGrade = clamp(computedGrade, input.scopedRange.lo, input.scopedRange.hi);

  const flags: string[] = [];
  const bandDef = getBand(input.band);
  const pathMismatch = bandDef.path !== input.careerPath && input.band !== "ceo";
  if (pathMismatch) {
    flags.push(
      `The ${bandDef.name} band is on the ${bandDef.path === "M" ? "Management" : "Individual Contributor"} path, but this job is set to ${input.careerPath === "M" ? "Management" : "Individual Contributor"}.`,
    );
  }
  if (input.band === "5FS" && !is5FSAvailable(input.companyGrade)) {
    flags.push("Band 5FS (Senior Management) is not offered for small business units (Company Grade 16–18).");
  }
  const checks = consistencyFlags(input.selections, input.careerPath);
  flags.push(...checks);

  const anomaly = pathMismatch || (input.band === "5FS" && !is5FSAvailable(input.companyGrade));
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
