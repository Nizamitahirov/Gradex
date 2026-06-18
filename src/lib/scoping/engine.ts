/**
 * GGS Step 1 — Business Analysis → Company Grade (CEO grade).
 * Implements the WTW GGS 4.2 Scope Data Matrix exactly (see docs/GGS_MODEL.md).
 *
 * Company Grade (16–25) = average of three Scope Grades:
 *   1. Revenue, 2. FTE Employees, 3. Diversity/Complexity × Geographic Breadth.
 * Pure & unit-tested.
 */

export type GeographicBreadth = "domestic" | "international" | "global";
export type DiversityComplexity = "low" | "medium" | "high";
export type BusinessSize = "small" | "medium" | "large";

export interface ScopingInputs {
  /** Annual revenue in MILLIONS of USD. */
  revenueMillions: number;
  /** Full-time-equivalent employees. */
  fteEmployees: number;
  diversityComplexity: DiversityComplexity;
  geographicBreadth: GeographicBreadth;
  /** Informational only. */
  industry?: string;
}

export interface ScopingResult {
  revenueGrade: number;
  fteGrade: number;
  dcGeoGrade: number;
  /** Averaged & rounded company grade (16–25). */
  companyGrade: number;
  ceoGrade: number;
  bottomGrade: number;
  topGrade: number;
  usedGrades: number[];
  businessSize: BusinessSize;
}

// Revenue (millions USD) lower thresholds → grade (§2.4).
const REVENUE_TIERS: { grade: number; from: number }[] = [
  { grade: 25, from: 100_000 },
  { grade: 24, from: 50_000 },
  { grade: 23, from: 10_000 },
  { grade: 22, from: 5_000 },
  { grade: 21, from: 2_000 },
  { grade: 20, from: 1_000 },
  { grade: 19, from: 500 },
  { grade: 18, from: 150 },
  { grade: 17, from: 75 },
  { grade: 16, from: 0 },
];

// FTE employees lower thresholds → grade (§2.5).
const FTE_TIERS: { grade: number; from: number }[] = [
  { grade: 25, from: 200_000 },
  { grade: 24, from: 75_000 },
  { grade: 23, from: 27_500 },
  { grade: 22, from: 10_600 },
  { grade: 21, from: 4_100 },
  { grade: 20, from: 1_600 },
  { grade: 19, from: 620 },
  { grade: 18, from: 240 },
  { grade: 17, from: 90 },
  { grade: 16, from: 0 },
];

// Diversity/Complexity × Geographic Breadth → grade (§2.3).
const DC_GEO_MATRIX: Record<DiversityComplexity, Record<GeographicBreadth, number>> = {
  low: { domestic: 16, international: 19, global: 20 },
  medium: { domestic: 18, international: 21, global: 22 },
  high: { domestic: 20, international: 23, global: 24 },
};

function tierGrade(value: number, tiers: { grade: number; from: number }[]): number {
  for (const t of tiers) if (value >= t.from) return t.grade;
  return 16;
}

export function revenueScopeGrade(revenueMillions: number): number {
  return tierGrade(revenueMillions, REVENUE_TIERS);
}

export function fteScopeGrade(fteEmployees: number): number {
  return tierGrade(fteEmployees, FTE_TIERS);
}

export function dcGeoScopeGrade(dc: DiversityComplexity, geo: GeographicBreadth): number {
  return DC_GEO_MATRIX[dc][geo];
}

export function businessSize(companyGrade: number): BusinessSize {
  if (companyGrade <= 18) return "small";
  if (companyGrade <= 22) return "medium";
  return "large";
}

export function computeScoping(inputs: ScopingInputs): ScopingResult {
  const revenueGrade = revenueScopeGrade(inputs.revenueMillions);
  const fteGrade = fteScopeGrade(inputs.fteEmployees);
  const dcGeoGrade = dcGeoScopeGrade(inputs.diversityComplexity, inputs.geographicBreadth);

  const companyGrade = Math.round((revenueGrade + fteGrade + dcGeoGrade) / 3);
  const ceoGrade = companyGrade;
  const bottomGrade = 1;
  const topGrade = companyGrade;
  const usedGrades: number[] = [];
  for (let g = bottomGrade; g <= topGrade; g++) usedGrades.push(g);

  return {
    revenueGrade,
    fteGrade,
    dcGeoGrade,
    companyGrade,
    ceoGrade,
    bottomGrade,
    topGrade,
    usedGrades,
    businessSize: businessSize(companyGrade),
  };
}

export const GEOGRAPHIC_BREADTH_OPTIONS: { value: GeographicBreadth; label: string; description: string }[] = [
  { value: "domestic", label: "Domestic", description: "Majority of operations in the home country or a small region." },
  { value: "international", label: "International", description: "Multi-function operations across a region or several countries on different continents." },
  { value: "global", label: "Global", description: "Key functions represented on three or more continents." },
];

export const DIVERSITY_COMPLEXITY_OPTIONS: { value: DiversityComplexity; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "Single industry / related products; non-complex or integrated entity." },
  { value: "medium", label: "Medium", description: "Some diversity or complexity across products / business units." },
  { value: "high", label: "High", description: "Multiple unrelated industries / full value chain / independent complex units." },
];
