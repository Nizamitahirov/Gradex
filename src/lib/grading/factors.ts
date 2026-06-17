/**
 * The seven grading factors — SPEC.md §8 & §9.1.
 *
 * Modeled entirely as data (id, name, why-it-matters, ordered levels with
 * label/description/score) so factors, level definitions and the scoring
 * model can be tuned in ONE place without touching components.
 *
 * Level definitions and point values are Gradex's own openly-defined model
 * (Appendix A) — not WTW's proprietary charts.
 */

export type FactorId =
  | "functionalKnowledge"
  | "businessExpertise"
  | "leadership"
  | "problemSolving"
  | "natureOfImpact"
  | "areaOfImpact"
  | "interpersonalSkills";

export interface FactorLevel {
  /** Ordered index, lowest (0) to highest. */
  index: number;
  label: string;
  description: string;
  score: number;
}

export interface FactorDef {
  id: FactorId;
  name: string;
  /** Plain-language "why this matters" shown in the wizard. */
  why: string;
  levels: FactorLevel[];
}

const lvl = (
  index: number,
  label: string,
  description: string,
  score: number,
): FactorLevel => ({ index, label, description, score });

export const FACTORS: FactorDef[] = [
  {
    id: "functionalKnowledge",
    name: "Functional Knowledge",
    why: "Depth and breadth of technical know-how is the strongest single driver of job size.",
    levels: [
      lvl(0, "Simple tasks", "Performs basic, repetitive tasks needing little prior knowledge.", 0),
      lvl(1, "Established procedures", "Applies defined procedures and standard methods within a job.", 3),
      lvl(2, "Job & practical methods", "Solid working knowledge of practices and methods in a single area.", 6),
      lvl(3, "Broad concepts of a discipline", "Understands the principles and concepts of a professional discipline.", 10),
      lvl(4, "Full theory & practice", "Comprehensive command of theory and practice across a discipline.", 14),
      lvl(5, "Authority across disciplines", "Mastery spanning multiple disciplines; sets technical direction broadly.", 18),
    ],
  },
  {
    id: "businessExpertise",
    name: "Business Expertise",
    why: "Bigger jobs require seeing how the business makes money, not just how to do a task.",
    levels: [
      lvl(0, "Own work unit", "Understands how their own immediate work unit operates.", 0),
      lvl(1, "Own function", "Understands how their function works and contributes.", 2),
      lvl(2, "Related functions", "Grasps how several related functions interconnect.", 5),
      lvl(3, "Multiple functions / business model", "Understands the broader business model across functions.", 8),
      lvl(4, "Industry & market", "Deep grasp of the industry, market dynamics and competition.", 11),
    ],
  },
  {
    id: "leadership",
    name: "Leadership",
    why: "Responsibility for others' work materially increases job size and separates the management path.",
    levels: [
      lvl(0, "None", "No responsibility for the work of others.", 0),
      lvl(1, "Informal / peer guidance", "Provides informal guidance or training to peers.", 2),
      lvl(2, "Supervises a small team", "Coordinates the day-to-day work of a small team.", 5),
      lvl(3, "Manages a team / unit", "Accountable for a team or unit's results through others.", 9),
      lvl(4, "Manages a function", "Leads a function, typically managing other managers.", 13),
      lvl(5, "Enterprise leadership", "Leads multiple functions or the enterprise.", 17),
    ],
  },
  {
    id: "problemSolving",
    name: "Problem Solving",
    why: "The harder and more ambiguous the thinking required, the bigger the job.",
    levels: [
      lvl(0, "Follow clear rules", "Resolves issues by following clear, established rules.", 0),
      lvl(1, "Choose among known solutions", "Selects the best fit from known, documented solutions.", 3),
      lvl(2, "Adapt & analyze", "Analyzes situations and adapts approaches to fit.", 6),
      lvl(3, "Solve novel problems", "Solves new, undefined problems with limited precedent.", 10),
      lvl(4, "Create new frameworks", "Creates original frameworks, strategy or methodology.", 14),
    ],
  },
  {
    id: "natureOfImpact",
    name: "Nature of Impact",
    why: "A job that directly determines results is larger than one that merely supports.",
    levels: [
      lvl(0, "Indirect / supporting", "Supports outcomes indirectly through assigned tasks.", 0),
      lvl(1, "Contributory", "Contributes meaningfully to a shared result.", 2),
      lvl(2, "Significant / shared", "Has a significant, shared influence on results.", 5),
      lvl(3, "Primary / determining", "Primarily determines outcomes in their area.", 8),
      lvl(4, "Defines enterprise outcomes", "Decisions define enterprise-level outcomes.", 11),
    ],
  },
  {
    id: "areaOfImpact",
    name: "Area of Impact",
    why: "Breadth of impact scales job size with organizational reach.",
    levels: [
      lvl(0, "Own role / task", "Impact is confined to the job's own tasks.", 0),
      lvl(1, "Team", "Impact felt across the immediate team.", 2),
      lvl(2, "Department / function", "Impact spans a department or function.", 4),
      lvl(3, "Business unit", "Impact reaches across a business unit.", 7),
      lvl(4, "Whole organization", "Impact felt across the whole organization.", 10),
      lvl(5, "External / market", "Impact extends to external markets and stakeholders.", 13),
    ],
  },
  {
    id: "interpersonalSkills",
    name: "Interpersonal Skills",
    why: "The higher the stakes of the relationships a job manages, the bigger it is.",
    levels: [
      lvl(0, "Exchange information", "Basic, courteous exchange of routine information.", 0),
      lvl(1, "Explain / advise", "Explains concepts and advises others.", 2),
      lvl(2, "Persuade / negotiate", "Persuades and negotiates to reach outcomes.", 4),
      lvl(3, "Influence senior stakeholders", "Influences senior internal stakeholders on key matters.", 6),
      lvl(4, "Shape external relationships", "Shapes strategic external and high-stakes relationships.", 8),
    ],
  },
];

export const FACTOR_IDS = FACTORS.map((f) => f.id) as FactorId[];

export const FACTOR_MAP: Record<FactorId, FactorDef> = Object.fromEntries(
  FACTORS.map((f) => [f.id, f]),
) as Record<FactorId, FactorDef>;

/** Default per-factor weights (all 1.0). Per-org overrides allowed later. */
export const DEFAULT_WEIGHTS: Record<FactorId, number> = {
  functionalKnowledge: 1,
  businessExpertise: 1,
  leadership: 1,
  problemSolving: 1,
  natureOfImpact: 1,
  areaOfImpact: 1,
  interpersonalSkills: 1,
};
