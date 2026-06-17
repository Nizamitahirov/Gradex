/**
 * Banding model — SPEC.md §7.
 *
 * Bands are broad career tiers. Each maps to a default grade range (of 1–25)
 * that gets intersected with the org's scoped used-grade range to form the
 * "candidate grade window" grading must land within.
 *
 * These ranges are Gradex's own model (see Appendix A).
 */

export type CareerPath = "IC" | "M";

export type BandKey =
  | "manual"
  | "clerical"
  | "para_professional"
  | "professional"
  | "expert"
  | "supervisory"
  | "manager"
  | "senior_manager"
  | "director"
  | "executive"
  | "ceo";

export interface BandDef {
  key: BandKey;
  name: string;
  path: CareerPath;
  /** Default typical grade range of 1–25. */
  range: { lo: number; hi: number };
  description: string;
}

export const BANDS: BandDef[] = [
  {
    key: "manual",
    name: "Manual / Operational",
    path: "IC",
    range: { lo: 1, hi: 6 },
    description: "Routine physical or operational tasks; defined procedures.",
  },
  {
    key: "clerical",
    name: "Clerical / Administrative",
    path: "IC",
    range: { lo: 3, hi: 8 },
    description: "Administrative & support tasks; established methods.",
  },
  {
    key: "para_professional",
    name: "Para-professional / Technical Support",
    path: "IC",
    range: { lo: 5, hi: 10 },
    description: "Applied technical skills; some judgment within guidelines.",
  },
  {
    key: "professional",
    name: "Professional",
    path: "IC",
    range: { lo: 8, hi: 15 },
    description:
      "Theoretical/conceptual knowledge of a discipline; solves problems analytically.",
  },
  {
    key: "expert",
    name: "Expert / Specialist (SME)",
    path: "IC",
    range: { lo: 13, hi: 20 },
    description: "Deep authority in a field; advances the discipline; no management duties.",
  },
  {
    key: "supervisory",
    name: "Supervisory / Team Lead",
    path: "M",
    range: { lo: 9, hi: 13 },
    description: "Coordinates a team's day-to-day work; first level of people responsibility.",
  },
  {
    key: "manager",
    name: "Manager",
    path: "M",
    range: { lo: 12, hi: 17 },
    description: "Manages a function or team; accountable for results through others.",
  },
  {
    key: "senior_manager",
    name: "Senior / Middle Management",
    path: "M",
    range: { lo: 15, hi: 20 },
    description: "Manages managers or a sizeable function; sets operational direction.",
  },
  {
    key: "director",
    name: "Director / Function Head",
    path: "M",
    range: { lo: 18, hi: 22 },
    description: "Leads a major function or business unit; shapes strategy.",
  },
  {
    key: "executive",
    name: "Executive",
    path: "M",
    range: { lo: 21, hi: 24 },
    description: "Top leadership team; enterprise-level accountability.",
  },
  {
    key: "ceo",
    name: "CEO / Top Job",
    path: "M",
    range: { lo: 25, hi: 25 },
    description: "The single top job; anchored by scoping.",
  },
];

export const BAND_KEYS = BANDS.map((b) => b.key) as BandKey[];

export const BAND_MAP: Record<BandKey, BandDef> = Object.fromEntries(
  BANDS.map((b) => [b.key, b]),
) as Record<BandKey, BandDef>;

export function getBand(key: BandKey): BandDef {
  return BAND_MAP[key];
}

export function bandsForPath(path: CareerPath): BandDef[] {
  return BANDS.filter((b) => b.path === path);
}

/**
 * The candidate grade window: the band's default range intersected with the
 * org's scoped used-grade range. If the intersection is empty (band sits
 * entirely outside the org scope) we fall back to the org range so grading can
 * still proceed, and callers should treat the mismatch as an anomaly.
 */
export function candidateWindow(
  band: BandKey,
  scoped: { lo: number; hi: number },
): { lo: number; hi: number } {
  const r = BAND_MAP[band].range;
  const lo = Math.max(r.lo, scoped.lo);
  const hi = Math.min(r.hi, scoped.hi);
  if (lo > hi) return { ...scoped };
  return { lo, hi };
}
