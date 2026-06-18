/**
 * GGS Step 3 — the seven grading factors (WTW GGS 4.2 §4). See docs/GGS_MODEL.md.
 *
 * Each factor is an ordered hierarchy of levels (low → high) following the GGS
 * factor definitions. A job's selected levels place it within its band's grade
 * window (see engine.ts). Modeled as data so definitions/scales live in one place.
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
  index: number;
  label: string;
  description: string;
  /** Ordinal score (equals index); the engine normalizes by the factor's max. */
  score: number;
}

export interface FactorDef {
  id: FactorId;
  name: string;
  why: string;
  levels: FactorLevel[];
}

const L = (index: number, label: string, description: string): FactorLevel => ({
  index,
  label,
  description,
  score: index,
});

export const FACTORS: FactorDef[] = [
  {
    id: "functionalKnowledge",
    name: "Job Functional Knowledge",
    why: "Knowledge of functional work, from single-step tasks to the theory and practice of a discipline.",
    levels: [
      L(0, "Specific work tasks", "A limited number of routine, repetitive tasks; little or no training required."),
      L(1, "Procedures of own job", "Full knowledge of the activities and well-defined procedures of own job."),
      L(2, "Concepts within a discipline", "Understands processes and the underlying concepts/principles of a discipline."),
      L(3, "Theory & practice", "Professional-level command of the theory and practice of a discipline."),
      L(4, "Broad disciplinary authority", "Deep, broad knowledge; recognized authority within a discipline."),
      L(5, "Multi-discipline mastery", "Mastery spanning multiple disciplines; sets technical direction broadly."),
    ],
  },
  {
    id: "businessExpertise",
    name: "Business Expertise",
    why: "Knowledge about the business itself, from the work unit through to the industry and commercial environment.",
    levels: [
      L(0, "Own job", "Understanding limited to own tasks; no need to see how the job fits the wider unit."),
      L(1, "Own team", "Aware of how assigned duties contribute to the work of the immediate team."),
      L(2, "Area / sub-function", "Understands how the team integrates with others to achieve the area's objectives."),
      L(3, "Business unit", "Understands the broader business unit and how it operates."),
      L(4, "Industry & commercial", "Deep grasp of the industry and the commercial environment."),
    ],
  },
  {
    id: "leadership",
    name: "Leadership",
    why: "The nature and breadth of leadership and guidance provided to others (including informal role-modelling).",
    levels: [
      L(0, "None", "No supervisory responsibility beyond self-management of own workload."),
      L(1, "Informal guidance", "Provides on-the-job training/guidance or acts as a role model; no formal authority."),
      L(2, "Supervise a team", "Coordinates and supervises the day-to-day work of a team."),
      L(3, "Manage through others", "Full line management of a team, accountable for results through others."),
      L(4, "Manage a function", "Leads a function, typically managing other managers."),
      L(5, "Enterprise leadership", "Provides leadership across the business unit or enterprise."),
    ],
  },
  {
    id: "problemSolving",
    name: "Problem Solving",
    why: "The mental skills required — analysis, judgement, decision-making — and the structure available to rely on.",
    levels: [
      L(0, "Common sense", "Uses common sense to complete routine tasks; simple choices among known things."),
      L(1, "Defined procedures", "Applies defined procedures and simple judgement in straightforward situations."),
      L(2, "Analyze & select", "Analyzes factual information and selects appropriate alternatives from defined options."),
      L(3, "Solve novel problems", "Devises solutions to new problems from first principles with limited precedent."),
      L(4, "Create frameworks / strategy", "Creates new frameworks, methodologies or strategy."),
    ],
  },
  {
    id: "natureOfImpact",
    name: "Nature of Impact",
    why: "How the job affects the business, from tangential support to primary operational and strategic responsibility.",
    levels: [
      L(0, "Minimal / indirect", "Very limited or indirect impact on results."),
      L(1, "Accuracy of tasks", "Small but direct impact through the accuracy of the tasks performed."),
      L(2, "Quality of input", "Meaningful impact through the quality and influence of the work."),
      L(3, "Shared accountability", "Significant, shared accountability for operational results."),
      L(4, "Primary / strategic", "Primary operational and strategic responsibility for results."),
    ],
  },
  {
    id: "areaOfImpact",
    name: "Area of Impact",
    why: "Where the impact is felt across organizational entities, from own job to the whole enterprise or market.",
    levels: [
      L(0, "Own job", "Impact restricted to the work of the job itself."),
      L(1, "Own team", "Impact felt across the immediate team."),
      L(2, "Area / sub-function", "Impact spans an area or sub-function."),
      L(3, "Function", "Impact reaches across an organizational function."),
      L(4, "Business unit", "Impact felt across the business unit."),
      L(5, "Enterprise / external", "Impact extends across the enterprise and to external markets."),
    ],
  },
  {
    id: "interpersonalSkills",
    name: "Interpersonal Skills",
    why: "The level and type of people skills required on an ongoing basis to perform the role.",
    levels: [
      L(0, "Common courtesy", "Clear verbal communication and ordinary/common courtesy."),
      L(1, "Exchange information", "Routine exchange of information with others."),
      L(2, "Advise / explain", "Explains concepts and advises others."),
      L(3, "Persuade / negotiate", "Persuades and negotiates to reach outcomes."),
      L(4, "Influence stakeholders", "Influences senior internal stakeholders on important matters."),
      L(5, "Shape strategic relationships", "Shapes strategic and high-stakes external relationships."),
    ],
  },
];

export const FACTOR_IDS = FACTORS.map((f) => f.id) as FactorId[];

export const FACTOR_MAP: Record<FactorId, FactorDef> = Object.fromEntries(
  FACTORS.map((f) => [f.id, f]),
) as Record<FactorId, FactorDef>;

export const DEFAULT_WEIGHTS: Record<FactorId, number> = {
  functionalKnowledge: 1,
  businessExpertise: 1,
  leadership: 1,
  problemSolving: 1,
  natureOfImpact: 1,
  areaOfImpact: 1,
  interpersonalSkills: 1,
};
