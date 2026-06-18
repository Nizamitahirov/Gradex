import { describe, it, expect } from "vitest";
import { gradeJob } from "./engine";
import { FACTOR_MAP, FACTOR_IDS } from "./factors";
import { bandGradeWindow } from "./bands";
import type { FactorSelections } from "./engine";

const scoped = { lo: 1, hi: 21 };
const companyGrade = 21;

const allLowest: FactorSelections = Object.fromEntries(FACTOR_IDS.map((id) => [id, 0]));
const allHighest: FactorSelections = Object.fromEntries(
  FACTOR_IDS.map((id) => [id, FACTOR_MAP[id].levels.length - 1]),
);

describe("gradeJob — in-band placement", () => {
  it("flags incomplete until all seven factors are answered", () => {
    const res = gradeJob({ selections: { functionalKnowledge: 2 }, band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.complete).toBe(false);
  });

  it("places the job inside the band window", () => {
    const res = gradeJob({ selections: { functionalKnowledge: 3, businessExpertise: 2, leadership: 1, problemSolving: 2, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 2 }, band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const w = bandGradeWindow("3IC", companyGrade);
    expect(res.finalGrade).toBeGreaterThanOrEqual(w.lo);
    expect(res.finalGrade).toBeLessThanOrEqual(w.hi);
    expect(res.complete).toBe(true);
  });

  it("lowest answers sit at the band floor, highest at the band ceiling", () => {
    const lo = gradeJob({ selections: allLowest, band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const hi = gradeJob({ selections: allHighest, band: "3IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    const w = bandGradeWindow("3IC", companyGrade);
    expect(lo.finalGrade).toBe(w.lo);
    expect(hi.finalGrade).toBe(w.hi);
  });

  it("CEO band lands at the company grade", () => {
    const res = gradeJob({ selections: allHighest, band: "ceo", careerPath: "M", scopedRange: scoped, companyGrade });
    expect(res.finalGrade).toBe(companyGrade);
  });

  it("flags a path mismatch between band and career path", () => {
    const res = gradeJob({ selections: allLowest, band: "4M", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.toLowerCase().includes("path"))).toBe(true);
  });

  it("flags 5FS as unavailable for a small business unit", () => {
    const res = gradeJob({ selections: allHighest, band: "5FS", careerPath: "M", scopedRange: { lo: 1, hi: 17 }, companyGrade: 17 });
    expect(res.anomaly).toBe(true);
    expect(res.flags.some((f) => f.includes("5FS"))).toBe(true);
  });

  it("warns when an IC has top-level Leadership", () => {
    const res = gradeJob({ selections: { ...allLowest, leadership: 5 }, band: "4IC", careerPath: "IC", scopedRange: scoped, companyGrade });
    expect(res.flags.some((f) => f.toLowerCase().includes("management path"))).toBe(true);
  });

  it("produces a seven-row breakdown", () => {
    const res = gradeJob({ selections: allHighest, band: "ceo", careerPath: "M", scopedRange: scoped, companyGrade });
    expect(res.breakdown).toHaveLength(7);
  });
});
