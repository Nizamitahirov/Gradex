/**
 * Pay structure (grade table) engine — Total Rewards.
 *
 * Builds a salary scale across the org's grades with five reference points per
 * grade: LD (lower decile), LQ (lower quartile), Median, UQ (upper quartile),
 * UD (upper decile). All values are derived from a single start median plus a
 * vertical step (grade-to-grade midpoint progression) and a horizontal step
 * (spacing between adjacent reference points within a grade).
 */

export type StartAnchor = "ld" | "lq" | "median" | "uq" | "ud";

export interface PayScaleParams {
  /** The start number for the lowest grade, interpreted at `startAnchor`. */
  startMedian: number;
  /** Which reference point the start number represents (default "median"). */
  startAnchor?: StartAnchor;
  /** Grade-to-grade midpoint increase, e.g. 0.08 = +8% per grade. */
  verticalPct: number;
  /** Step between adjacent reference points (LQ→Median→UQ …), e.g. 0.07. */
  horizontalPct: number;
  currency: string;
  /** Round values to the nearest … (e.g. 50). */
  rounding?: number;
}

export interface PayRow {
  grade: number;
  ld: number;
  lq: number;
  median: number;
  uq: number;
  ud: number;
  /** Range spread UD/LD − 1, as %. */
  spreadPct: number;
}

function round(v: number, to: number) {
  return Math.max(0, Math.round(v / to) * to);
}

/** Convert a start number at a given anchor into the lowest grade's median. */
function anchorToMedian(startValue: number, anchor: StartAnchor, h: number): number {
  switch (anchor) {
    case "ld":
      return startValue * Math.pow(1 + h, 2);
    case "lq":
      return startValue * (1 + h);
    case "uq":
      return startValue / (1 + h);
    case "ud":
      return startValue / Math.pow(1 + h, 2);
    case "median":
    default:
      return startValue;
  }
}

/** Build the full pay scale for the given grades (ascending). */
export function computePayScale(params: PayScaleParams, gradesAsc: number[]): PayRow[] {
  const { startMedian, verticalPct, horizontalPct } = params;
  const to = params.rounding ?? 50;
  const h = horizontalPct;
  const startMedianValue = anchorToMedian(startMedian, params.startAnchor ?? "median", h);
  return gradesAsc.map((grade, i) => {
    const median = startMedianValue * Math.pow(1 + verticalPct, i);
    const lq = median / (1 + h);
    const ld = median / Math.pow(1 + h, 2);
    const uq = median * (1 + h);
    const ud = median * Math.pow(1 + h, 2);
    return {
      grade,
      ld: round(ld, to),
      lq: round(lq, to),
      median: round(median, to),
      uq: round(uq, to),
      ud: round(ud, to),
      spreadPct: Math.round((ud / ld - 1) * 100),
    };
  });
}

/** Where a salary falls within a grade's range. */
export interface RangePlacement {
  compaRatio: number; // salary / median
  penetration: number; // 0..100 across [ld, ud]
  zone: "below" | "Q1" | "Q2" | "Q3" | "Q4" | "above";
  status: "underpaid" | "meets" | "overpaid";
}

export function placeSalary(salary: number, row: PayRow): RangePlacement {
  const compaRatio = row.median ? salary / row.median : 0;
  const span = row.ud - row.ld;
  const penetration = span > 0 ? ((salary - row.ld) / span) * 100 : 0;
  let zone: RangePlacement["zone"];
  if (salary < row.ld) zone = "below";
  else if (salary < row.lq) zone = "Q1";
  else if (salary < row.median) zone = "Q2";
  else if (salary < row.uq) zone = "Q3";
  else if (salary <= row.ud) zone = "Q4";
  else zone = "above";
  const status = salary < row.ld ? "underpaid" : salary > row.ud ? "overpaid" : "meets";
  return { compaRatio, penetration, zone, status };
}

export function formatMoney(v: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v || 0);
}
