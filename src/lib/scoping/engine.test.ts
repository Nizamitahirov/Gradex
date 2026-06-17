import { describe, it, expect } from "vitest";
import { computeScoping } from "./engine";

describe("computeScoping", () => {
  it("smallest orgs land near the low calibration target (top grade 12–14)", () => {
    const r = computeScoping({
      revenue: 2_000_000,
      currency: "USD",
      headcount: 20,
      geoBreadth: "single",
      complexity: "single",
    });
    expect(r.breakdown.total).toBe(0);
    expect(r.topGrade).toBeGreaterThanOrEqual(12);
    expect(r.topGrade).toBeLessThanOrEqual(14);
    expect(r.ceoGrade).toBe(r.topGrade);
    expect(r.bottomGrade).toBeGreaterThanOrEqual(1);
  });

  it("mid-size orgs land near the mid calibration target (top grade 18–20)", () => {
    const r = computeScoping({
      revenue: 2_000_000_000, // $2B → 3 pts
      currency: "USD",
      headcount: 5_000, // 3 pts
      geoBreadth: "national", // 2 pts
      complexity: "few", // 1 pt
    });
    expect(r.breakdown.total).toBe(9);
    expect(r.topGrade).toBeGreaterThanOrEqual(18);
    expect(r.topGrade).toBeLessThanOrEqual(20);
  });

  it("largest / most complex orgs reach the top of the scale (24–25)", () => {
    const r = computeScoping({
      revenue: 80_000_000_000, // 5 pts
      currency: "USD",
      headcount: 120_000, // 5 pts
      geoBreadth: "global", // 4 pts
      complexity: "conglomerate", // 4 pts
    });
    expect(r.breakdown.total).toBe(18);
    expect(r.topGrade).toBeGreaterThanOrEqual(24);
    expect(r.topGrade).toBeLessThanOrEqual(25);
  });

  it("produces a contiguous used-grade range and grows span with size", () => {
    const small = computeScoping({
      revenue: 2_000_000,
      currency: "USD",
      headcount: 20,
      geoBreadth: "single",
      complexity: "single",
    });
    const big = computeScoping({
      revenue: 80_000_000_000,
      currency: "USD",
      headcount: 120_000,
      geoBreadth: "global",
      complexity: "conglomerate",
    });
    // contiguous
    expect(small.usedGrades[0]).toBe(small.bottomGrade);
    expect(small.usedGrades[small.usedGrades.length - 1]).toBe(small.topGrade);
    // bigger orgs span more grades
    expect(big.usedGrades.length).toBeGreaterThan(small.usedGrades.length);
  });

  it("top grade never decreases as complexity rises (monotonic)", () => {
    const complexities = ["single", "few", "multiple", "conglomerate"] as const;
    let prevTop = 0;
    for (const complexity of complexities) {
      const r = computeScoping({
        revenue: 2_000_000_000,
        currency: "USD",
        headcount: 5_000,
        geoBreadth: "national",
        complexity,
      });
      expect(r.topGrade).toBeGreaterThanOrEqual(prevTop);
      prevTop = r.topGrade;
    }
  });
});
