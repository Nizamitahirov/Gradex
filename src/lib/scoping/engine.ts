/**
 * Scoping engine — SPEC.md §6 (GGS step 1).
 *
 * Sizes the ORGANIZATION first to calibrate which slice of the 1–25 grade
 * scale it should use and where the CEO sits. Pure & unit-tested.
 *
 * All point tables and the calibration mapping are Gradex's own model.
 */

export type GeoBreadth = "single" | "regional" | "national" | "multinational" | "global";
export type Complexity = "single" | "few" | "multiple" | "conglomerate";

export interface ScopingInputs {
  /** Annual revenue in the org's currency (absolute amount). */
  revenue: number;
  currency: string;
  /** Total headcount. */
  headcount: number;
  geoBreadth: GeoBreadth;
  complexity: Complexity;
  /** Informational only in v1; does not affect the math. */
  industry?: string;
}

export interface ScopingBreakdown {
  revenuePoints: number;
  headcountPoints: number;
  geoPoints: number;
  complexityPoints: number;
  total: number;
}

export interface ScopingResult {
  topGrade: number;
  bottomGrade: number;
  ceoGrade: number;
  usedGrades: number[];
  breakdown: ScopingBreakdown;
}

// --- Point tables (§6) ---

/** Revenue tier → 0–5 pts. Thresholds in absolute currency units. */
function revenuePoints(revenue: number): number {
  if (revenue < 10_000_000) return 0; // < $10M
  if (revenue < 100_000_000) return 1; // $10M–$100M
  if (revenue < 1_000_000_000) return 2; // $100M–$1B
  if (revenue < 10_000_000_000) return 3; // $1B–$10B
  if (revenue < 50_000_000_000) return 4; // $10B–$50B
  return 5; // > $50B
}

/** Headcount tier → 0–5 pts. */
function headcountPoints(headcount: number): number {
  if (headcount < 50) return 0;
  if (headcount < 250) return 1;
  if (headcount < 1_000) return 2;
  if (headcount < 10_000) return 3;
  if (headcount < 50_000) return 4;
  return 5;
}

/** Geographic breadth → 0–4 pts. */
const GEO_POINTS: Record<GeoBreadth, number> = {
  single: 0,
  regional: 1,
  national: 2,
  multinational: 3,
  global: 4,
};

/** Business complexity → 0–4 pts. */
const COMPLEXITY_POINTS: Record<Complexity, number> = {
  single: 0,
  few: 1,
  multiple: 3,
  conglomerate: 4,
};

/**
 * Top-grade calibration table mapping S (0–18) → top grade.
 * Calibration targets (§6):
 *   S≈0–2  → ~12–14   (smallest orgs)
 *   S≈7–10 → ~18–20   (mid orgs)
 *   S≈16–18→ ~24–25   (largest/most complex)
 * Monotonic, documented lookup.
 */
const TOP_GRADE_BY_S: number[] = [
  12, // S=0
  13, // 1
  14, // 2
  15, // 3
  16, // 4
  17, // 5
  17, // 6
  18, // 7
  19, // 8
  19, // 9
  20, // 10
  21, // 11
  21, // 12
  22, // 13
  23, // 14
  23, // 15
  24, // 16
  24, // 17
  25, // 18
];

/**
 * How many grade steps the org spans, growing with size.
 * Small orgs span ~8 grades, giants ~19.
 */
function spanFromS(s: number): number {
  // Linear interpolation 8 (S=0) → 19 (S=18), rounded.
  return Math.round(8 + (s / 18) * (19 - 8));
}

export function computeScoping(inputs: ScopingInputs): ScopingResult {
  const rp = revenuePoints(inputs.revenue);
  const hp = headcountPoints(inputs.headcount);
  const gp = GEO_POINTS[inputs.geoBreadth];
  const cp = COMPLEXITY_POINTS[inputs.complexity];
  const total = rp + hp + gp + cp; // 0–18

  const topGrade = TOP_GRADE_BY_S[Math.min(total, TOP_GRADE_BY_S.length - 1)];
  const span = spanFromS(total);
  const bottomGrade = Math.max(1, topGrade - span);

  const usedGrades: number[] = [];
  for (let g = bottomGrade; g <= topGrade; g++) usedGrades.push(g);

  return {
    topGrade,
    bottomGrade,
    ceoGrade: topGrade,
    usedGrades,
    breakdown: {
      revenuePoints: rp,
      headcountPoints: hp,
      geoPoints: gp,
      complexityPoints: cp,
      total,
    },
  };
}

export const GEO_BREADTH_OPTIONS: { value: GeoBreadth; label: string }[] = [
  { value: "single", label: "Single location" },
  { value: "regional", label: "City / Region" },
  { value: "national", label: "National" },
  { value: "multinational", label: "Multi-national (few countries)" },
  { value: "global", label: "Global (many countries)" },
];

export const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: "single", label: "Single product/service, simple ops" },
  { value: "few", label: "Few product lines" },
  { value: "multiple", label: "Multiple diverse business units" },
  { value: "conglomerate", label: "Highly diversified conglomerate" },
];
