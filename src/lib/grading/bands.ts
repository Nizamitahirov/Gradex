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
 * Grade window for a band given the Company Grade C (the CEO grade).
 * Lower bands (1, 2, 3IC, 3M) are fixed; upper bands shift with C. Documented
 * approximation of the GGS grade maps (exact maps are WTW-proprietary visuals).
 * Always clamped to [1, C].
 */
export function bandGradeWindow(band: BandKey, companyGrade: number): { lo: number; hi: number } {
  const C = companyGrade;
  const clamp = (lo: number, hi: number) => {
    let L = Math.max(1, Math.min(lo, C));
    const H = Math.max(1, Math.min(hi, C));
    if (L > H) L = H;
    return { lo: L, hi: H };
  };

  switch (band) {
    case "1":
      return clamp(1, 4);
    case "2":
      return clamp(3, 8);
    case "3IC":
      return clamp(7, 12);
    case "3M":
      return clamp(8, 12);
    case "4IC":
      return clamp(C - 8, C - 4);
    case "4M":
      return clamp(C - 7, C - 4);
    case "5FS":
      return clamp(C - 4, C - 3);
    case "5BS":
      return clamp(C - 2, C - 1);
    case "ceo":
      return clamp(C, C);
  }
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
