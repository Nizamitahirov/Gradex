import { describe, it, expect } from "vitest";
import { gradeJob } from "./engine";
import { FACTOR_IDS } from "./factors";
import { factorLevels } from "./band-factors";
import { bandGradeWindow, type BandKey } from "./bands";
import type { FactorSelections } from "./engine";

const scoped = { lo: 1, hi: 21 };
const companyGrade = 21;

/** All factors at their lowest / highest level for the given band. */
const lowestFor = (_band: BandKey): FactorSelections => Object.fromEntries(FACTOR_IDS.map((id) => [id, 0]));
const highestFor = (band: BandKey): FactorSelections =>
  Object.fromEntries(FACTOR_IDS.map((id) => [id, Math.max(0, factorLevels(band, id).length - 1)]));

describe("gradeJob — in-band placement (band-specific levels)", () => {
  it("flags incomplete until all seven factors are answered", () => {
    const res = gradeJob({ selections: { functionalKnowledge: 2 }, band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.complete).toBe(false);
  });

  it("places the job inside the band window", () => {
    const res = gradeJob({ selections: highestFor("3IC"), band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const w = bandGradeWindow("3IC", companyGrade);
    expect(res.finalGrade).toBeGreaterThanOrEqual(w.lo);
    expect(res.finalGrade).toBeLessThanOrEqual(w.hi);
    expect(res.complete).toBe(true);
  });

  it("lowest answers sit at the band floor, highest at the band ceiling", () => {
    const lo = gradeJob({ selections: lowestFor("3IC"), band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const hi = gradeJob({ selections: highestFor("3IC"), band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const w = bandGradeWindow("3IC", companyGrade);
    expect(lo.finalGrade).toBe(w.lo);
    expect(hi.finalGrade).toBe(w.hi);
  });

  it("uses only the levels defined for the band (2–4 per factor, not a fixed 6)", () => {
    const ld3ic = factorLevels("3IC", "leadership").length;
    const ld1 = factorLevels("1", "leadership").length;
    expect(ld3ic).toBe(4);
    expect(ld1).toBe(1);
  });

  it("CEO band lands at the company grade and is complete without factors", () => {
    const res = gradeJob({ selections: {}, band: "ceo", careerPath: "M", scopedRange: scoped, companyGrade });
    expect(res.finalGrade).toBe(companyGrade);
    expect(res.complete).toBe(true);
  });

  it("flags a path mismatch between band and career path", () => {
    const res = gradeJob({ selections: lowestFor("4M"), band: "4M", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.toLowerCase().includes("path"))).toBe(true);
  });

  it("flags 5FS as unavailable for a small business unit", () => {
    const res = gradeJob({ selections: highestFor("5FS"), band: "5FS", careerPath: "M", scopedRange: { lo: 1, hi: 17 }, companyGrade: 17 });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.includes("5FS"))).toBe(true);
  });

  it("warns when an IC has top-level Leadership", () => {
    const top = factorLevels("4IC", "leadership").length - 1;
    const res = gradeJob({ selections: { ...lowestFor("4IC"), leadership: top }, band: "4IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.flags.some((f) => f.toLowerCase().includes("management path"))).toBe(true);
  });

  it("produces a seven-row breakdown", () => {
    const res = gradeJob({ selections: highestFor("4M"), band: "4M", careerPath: "M", scopedRange: scoped, companyGrade });
    expect(res.breakdown).toHaveLength(7);
  });
});
