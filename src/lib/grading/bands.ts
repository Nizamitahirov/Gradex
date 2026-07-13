/**
 * GGS Step 2 — Bands (WTW GGS 4.2). See docs/GGS_MODEL.md.
 *
 * Bands are produced by the banding decision tree (banding-suggest.ts). Each
 * band occupies a window of global grades; the window for the upper bands
 * (4IC, 4M, 5FS, 5BS, CEO) shifts with the Company Grade, while 1, 2, 3IC and
 * 3M are independent of business-unit size.
 */

export type CareerPath = "IC" | "M";

export type BandKey = "1" | "2" | "3IC" | "4IC" | "3M" | "4M" | "5FS" | "5BS" | "ceo";

export interface BandDef {
  key: BandKey;
  /** Short code shown in the grid, e.g. "3IC". */
  code: string;
  name: string;
  path: CareerPath;
  contributesThrough: string;
  description: string;
}

export const BANDS: BandDef[] = [
  {
    key: "1",
    code: "1",
    name: "Manual / Junior Admin",
    path: "IC",
    contributesThrough: "Tasks",
    description:
      "Manual workers, messengers, receptionists, operators. Contribute with assistance; little or no previous experience.",
  },
  {
    key: "2",
    code: "2",
    name: "Clerical / Administrative",
    path: "IC",
    contributesThrough: "Skills",
    description:
      "Clerical, administrative and secretarial staff with little/no supervisory responsibility; skilled technicians/craftsmen.",
  },
  {
    key: "3IC",
    code: "3IC",
    name: "Professional",
    path: "IC",
    contributesThrough: "Expertise",
    description:
      "Individual contributors who independently apply professional expertise and judgment within a recognized field.",
  },
  {
    key: "4IC",
    code: "4IC",
    name: "Subject Matter Expert",
    path: "IC",
    contributesThrough: "Deep expertise",
    description:
      "Technical/professional thought leaders with deep expertise and few peers; key to the company for their knowledge.",
  },
  {
    key: "3M",
    code: "3M",
    name: "Junior Management / Supervisor",
    path: "M",
    contributesThrough: "Leadership",
    description:
      "First-line management and supervisory roles; responsibility for support and/or technical staff is a large part of the job.",
  },
  {
    key: "4M",
    code: "4M",
    name: "Middle Management",
    path: "M",
    contributesThrough: "Leadership",
    description:
      "Managers below heads of function who deliver through others via operational management of team(s).",
  },
  {
    key: "5FS",
    code: "5FS",
    name: "Senior Management",
    path: "M",
    contributesThrough: "Functional strategy",
    description:
      "Executive roles that set or significantly influence organizational functional strategy (not business-unit strategy).",
  },
  {
    key: "5BS",
    code: "5BS",
    name: "Top Management",
    path: "M",
    contributesThrough: "Business strategy",
    description:
      "Executive roles that determine or significantly influence business strategy and contribute through their vision.",
  },
  {
    key: "ceo",
    code: "CEO",
    name: "CEO / Business Unit Manager",
    path: "M",
    contributesThrough: "Business strategy (P&L)",
    description: "The single top job holding P&L responsibility for the business unit. Anchored by scoping.",
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

/** Is band 5FS available for this company grade? (Not offered for small BUs, CEO 16–18.) */
export function is5FSAvailable(companyGrade: number): boolean {
  return companyGrade >= 19;
}

/**
 * Reference grade map at Company Grade 20 (WTW GGS 4.2 grade map, guide p.18).
 * Per the guide, the lower bands (1, 2, 3IC, 3M) are size-independent, while the
 * upper bands (4IC, 4M, 5FS, 5BS, CEO) shift with the Company Grade ("grade
 * shift"). NOTE: these Company-20 windows should be verified against the exact
 * grade map on page 18 and adjusted here if they differ — everything derives
 * from this single table.
 */
const BASE_COMPANY_GRADE = 20;
const BASE_WINDOWS: Record<BandKey, { lo: number; hi: number }> = {
  "1": { lo: 6, hi: 8 },
  "2": { lo: 9, hi: 11 },
  "3IC": { lo: 12, hi: 14 },
  "3M": { lo: 13, hi: 15 },
  "4IC": { lo: 15, hi: 17 },
  "4M": { lo: 15, hi: 17 },
  "5FS": { lo: 17, hi: 18 },
  "5BS": { lo: 18, hi: 19 },
  ceo: { lo: 20, hi: 20 },
};
/** Bands whose grade window shifts with the Company Grade. */
const SHIFTING_BANDS = new Set<BandKey>(["4IC", "4M", "5FS", "5BS", "ceo"]);

/**
 * Grade window for a band given the Company Grade C (the CEO grade), anchored to
 * the Company-Grade-20 grade map and shifted for the upper bands. Clamped to [1, C].
 */
export function bandGradeWindow(band: BandKey, companyGrade: number): { lo: number; hi: number } {
  const C = companyGrade;
  const base = BASE_WINDOWS[band];
  const shift = SHIFTING_BANDS.has(band) ? C - BASE_COMPANY_GRADE : 0;
  let lo = Math.max(1, Math.min(base.lo + shift, C));
  const hi = Math.max(1, Math.min(base.hi + shift, C));
  if (lo > hi) lo = hi;
  return { lo, hi };
}

/**
 * Candidate grade window for grading: the band's window for the org's company
 * grade, intersected with the org's used-grade range.
 */
export function candidateWindow(
  band: BandKey,
  scoped: { lo: number; hi: number },
  companyGrade: number,
): { lo: number; hi: number } {
  const w = bandGradeWindow(band, companyGrade);
  const lo = Math.max(w.lo, scoped.lo);
  const hi = Math.min(w.hi, scoped.hi);
  if (lo > hi) return { ...w };
  return { lo, hi };
}
