import { describe, it, expect } from "vitest";
import { gradeJob, computeRMax, rawToGrade } from "./engine";
import { DEFAULT_WEIGHTS, FACTOR_MAP, FACTOR_IDS } from "./factors";
import type { FactorSelections } from "./engine";

const scoped = { lo: 6, hi: 23 };

/** Helper: pick the lowest level for every factor. */
const allLowest: FactorSelections = Object.fromEntries(
  FACTOR_IDS.map((id) => [id, 0]),
);

/** Helper: pick the highest level for every factor. */
const allHighest: FactorSelections = Object.fromEntries(
  FACTOR_IDS.map((id) => [id, FACTOR_MAP[id].levels.length - 1]),
);

describe("rawToGrade", () => {
  it("maps zero raw to grade 1 and max raw to grade 25", () => {
    const rMax = computeRMax(DEFAULT_WEIGHTS);
    expect(rawToGrade(0, rMax)).toBe(1);
    expect(rawToGrade(rMax, rMax)).toBe(25);
  });

  it("is monotonic across the raw range", () => {
    const rMax = computeRMax(DEFAULT_WEIGHTS);
    let prev = 0;
    for (let raw = 0; raw <= rMax; raw += rMax / 20) {
      const g = rawToGrade(raw, rMax);
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });
});

describe("computeRMax", () => {
  it("sums the top level of every factor (default weights)", () => {
    // 18 + 11 + 17 + 14 + 11 + 13 + 8 = 92
    expect(computeRMax(DEFAULT_WEIGHTS)).toBe(92);
  });
});

describe("gradeJob", () => {
  it("flags incomplete when a factor is unanswered", () => {
    const res = gradeJob({
      selections: { functionalKnowledge: 2 },
      band: "professional",
      careerPath: "IC",
      scopedRange: scoped,
    });
    expect(res.complete).toBe(false);
  });

  it("all-lowest answers clamp up to the scoped floor", () => {
    const res = gradeJob({
      selections: allLowest,
      band: "manual",
      careerPath: "IC",
      scopedRange: scoped,
    });
    expect(res.rawScore).toBe(0);
    expect(res.computedGrade).toBe(1);
    expect(res.finalGrade).toBe(scoped.lo); // clamped to org floor
    expect(res.complete).toBe(true);
  });

  it("all-highest answers reach the scoped ceiling", () => {
    const res = gradeJob({
      selections: allHighest,
      band: "executive",
      careerPath: "M",
      scopedRange: scoped,
    });
    expect(res.computedGrade).toBe(25);
    expect(res.finalGrade).toBe(scoped.hi); // clamped to org ceiling
  });

  it("produces a per-factor breakdown for explainability", () => {
    const res = gradeJob({
      selections: allHighest,
      band: "executive",
      careerPath: "M",
      scopedRange: scoped,
    });
    expect(res.breakdown).toHaveLength(7);
    const fk = res.breakdown.find((b) => b.id === "functionalKnowledge")!;
    expect(fk.score).toBe(18);
    expect(fk.weightedScore).toBe(18);
  });

  it("raises an anomaly when the grade falls outside the band window", () => {
    // Professional band window ~8–15, but max answers push to the ceiling (23).
    const res = gradeJob({
      selections: allHighest,
      band: "professional",
      careerPath: "IC",
      scopedRange: scoped,
    });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.includes("expected range"))).toBe(true);
    expect(res.confidence).toBe("low");
  });

  it("warns when an IC has top-level Leadership (likely mis-pathed)", () => {
    const res = gradeJob({
      selections: { ...allLowest, leadership: 5 },
      band: "expert",
      careerPath: "IC",
      scopedRange: scoped,
    });
    expect(res.flags.some((f) => f.toLowerCase().includes("mis-pathed"))).toBe(true);
  });

  it("flags a path mismatch between band and career path", () => {
    const res = gradeJob({
      selections: allLowest,
      band: "manager", // Management band
      careerPath: "IC", // but IC path
      scopedRange: scoped,
    });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.toLowerCase().includes("path"))).toBe(true);
  });

  it("gives high confidence for a well-centered, consistent result", () => {
    // Manager band window 12–17 within scope. Aim mid-range answers.
    const res = gradeJob({
      selections: {
        functionalKnowledge: 3,
        businessExpertise: 2,
        leadership: 3,
        problemSolving: 2,
        natureOfImpact: 2,
        areaOfImpact: 3,
        interpersonalSkills: 2,
      },
      band: "manager",
      careerPath: "M",
      scopedRange: scoped,
    });
    expect(res.anomaly).toBe(false);
    expect(res.finalGrade).toBeGreaterThanOrEqual(res.bandWindow.lo);
    expect(res.finalGrade).toBeLessThanOrEqual(res.bandWindow.hi);
  });
});
