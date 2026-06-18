import { describe, it, expect } from "vitest";
import {
  computeScoping,
  revenueScopeGrade,
  fteScopeGrade,
  dcGeoScopeGrade,
  businessSize,
} from "./engine";

describe("scope grade tables (GGS 4.2)", () => {
  it("maps revenue (millions USD) to the right scope grade", () => {
    expect(revenueScopeGrade(50)).toBe(16);
    expect(revenueScopeGrade(75)).toBe(17);
    expect(revenueScopeGrade(3_000)).toBe(21);
    expect(revenueScopeGrade(120_000)).toBe(25);
  });

  it("maps FTE employees to the right scope grade", () => {
    expect(fteScopeGrade(50)).toBe(16);
    expect(fteScopeGrade(8_000)).toBe(21);
    expect(fteScopeGrade(300_000)).toBe(25);
  });

  it("maps diversity/complexity × geographic breadth", () => {
    expect(dcGeoScopeGrade("low", "domestic")).toBe(16);
    expect(dcGeoScopeGrade("medium", "international")).toBe(21);
    expect(dcGeoScopeGrade("high", "global")).toBe(24);
  });
});

describe("computeScoping → Company Grade", () => {
  it("averages the three scope grades and rounds", () => {
    // revenue 3000→21, fte 8000→21, medium×international→21 ⇒ 21
    const r = computeScoping({
      revenueMillions: 3_000,
      fteEmployees: 8_000,
      geographicBreadth: "international",
      diversityComplexity: "medium",
    });
    expect(r.revenueGrade).toBe(21);
    expect(r.fteGrade).toBe(21);
    expect(r.dcGeoGrade).toBe(21);
    expect(r.companyGrade).toBe(21);
    expect(r.ceoGrade).toBe(21);
    expect(r.topGrade).toBe(21);
    expect(r.bottomGrade).toBe(1);
    expect(r.usedGrades[0]).toBe(1);
    expect(r.usedGrades.at(-1)).toBe(21);
  });

  it("Company Grade stays within 16–25", () => {
    const small = computeScoping({
      revenueMillions: 10,
      fteEmployees: 30,
      geographicBreadth: "domestic",
      diversityComplexity: "low",
    });
    expect(small.companyGrade).toBe(16);

    const huge = computeScoping({
      revenueMillions: 200_000,
      fteEmployees: 300_000,
      geographicBreadth: "global",
      diversityComplexity: "high",
    });
    expect(huge.companyGrade).toBeLessThanOrEqual(25);
    expect(huge.companyGrade).toBeGreaterThanOrEqual(24);
  });

  it("classifies business size", () => {
    expect(businessSize(17)).toBe("small");
    expect(businessSize(21)).toBe("medium");
    expect(businessSize(24)).toBe("large");
  });
});
