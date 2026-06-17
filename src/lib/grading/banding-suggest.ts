/**
 * Banding suggestion — SPEC.md §7 & §14 (Step 1).
 *
 * From a short set of qualifying questions, propose a band (with reasoning).
 * The user can always override. Pure function so it is unit-testable.
 */

import type { BandKey, CareerPath } from "./bands";

export type ContributionType = "tasks" | "expertise" | "leading";

export interface BandingAnswers {
  careerPath: CareerPath;
  /** Does the job manage people? */
  managesPeople: boolean;
  /** Management layers below this job (0 = ICs only, 1 = manages ICs, 2 = manages managers, 3 = manages a function/BU). */
  managementLayers: 0 | 1 | 2 | 3;
  /** Primary nature of contribution. */
  contribution: ContributionType;
  /** Is this the single top job? */
  isTopJob?: boolean;
}

export interface BandSuggestion {
  band: BandKey;
  reasoning: string;
}

export function suggestBand(a: BandingAnswers): BandSuggestion {
  if (a.isTopJob) {
    return { band: "ceo", reasoning: "Flagged as the single top job, so it anchors to the CEO band." };
  }

  if (a.careerPath === "M" || a.managesPeople) {
    switch (a.managementLayers) {
      case 0:
      case 1:
        return {
          band: "supervisory",
          reasoning: "Manages people at the first level (a team's day-to-day work).",
        };
      case 2:
        return {
          band: "manager",
          reasoning: "Accountable for results through others, managing a team or function.",
        };
      case 3:
      default:
        return {
          band: "senior_manager",
          reasoning: "Manages managers or a sizeable function, setting operational direction.",
        };
    }
  }

  // Individual Contributor path
  switch (a.contribution) {
    case "tasks":
      return {
        band: "clerical",
        reasoning: "Primarily performs defined tasks using established methods — an IC support role.",
      };
    case "expertise":
      return {
        band: "professional",
        reasoning: "Applies professional/disciplinary knowledge to solve problems analytically.",
      };
    case "leading":
      return {
        band: "expert",
        reasoning: "Deep authority that advances the discipline without managing people.",
      };
    default:
      return { band: "professional", reasoning: "Defaulted to the Professional band." };
  }
}
