/**
 * Grade color ramp (SPEC.md §4.2).
 *
 * The 25 global grades map to a perceptually-smooth ramp: low grades are
 * cool/muted, high grades are warm/saturated. The hue sweeps from a calm
 * teal-blue (~220°) through indigo-violet (the brand, ~285°) up into a warm
 * magenta/amber-rose at the top of the scale. Chroma and lightness rise with
 * grade so a bigger job literally looks "hotter".
 *
 * Returned as oklch() strings so they render identically to the token system.
 * A grade is recognizable by color anywhere in the app (grid, charts, badges).
 */

const GRADE_MIN = 1;
const GRADE_MAX = 25;

function clampGrade(grade: number): number {
  return Math.min(GRADE_MAX, Math.max(GRADE_MIN, Math.round(grade)));
}

/** Normalized 0..1 position of a grade on the scale. */
function t(grade: number): number {
  return (clampGrade(grade) - GRADE_MIN) / (GRADE_MAX - GRADE_MIN);
}

/** Hue sweep: 225° (cool blue) → 285° (indigo) → 350° (warm rose). */
function hueFor(p: number): number {
  return 225 + p * (350 - 225);
}

export interface GradeColor {
  /** Solid color for swatches / chart bars / badge backgrounds. */
  solid: string;
  /** Readable foreground (text) color to sit on `solid`. */
  foreground: string;
  /** Soft tinted surface for chips/cells in light contexts. */
  soft: string;
  /** Border tint to pair with `soft`. */
  softBorder: string;
}

export function gradeColor(grade: number): GradeColor {
  const p = t(grade);
  const hue = hueFor(p);
  // Lightness eases down a touch and chroma rises with grade.
  const l = 0.66 - p * 0.12; // 0.66 → 0.54
  const c = 0.09 + p * 0.13; // 0.09 → 0.22
  return {
    solid: `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${hue.toFixed(1)})`,
    foreground: l > 0.6 ? "oklch(0.18 0.02 285)" : "oklch(0.99 0 0)",
    soft: `oklch(0.96 ${(c * 0.45).toFixed(3)} ${hue.toFixed(1)})`,
    softBorder: `oklch(0.88 ${(c * 0.55).toFixed(3)} ${hue.toFixed(1)})`,
  };
}

/** Dark-mode soft surface variant for chips on dark backgrounds. */
export function gradeColorSoftDark(grade: number): { soft: string; softBorder: string } {
  const p = t(grade);
  const hue = hueFor(p);
  const c = 0.09 + p * 0.13;
  return {
    soft: `oklch(0.28 ${(c * 0.5).toFixed(3)} ${hue.toFixed(1)})`,
    softBorder: `oklch(0.4 ${(c * 0.6).toFixed(3)} ${hue.toFixed(1)})`,
  };
}

export const GRADE_RANGE = { min: GRADE_MIN, max: GRADE_MAX } as const;
