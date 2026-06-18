/**
 * GGS Step 2 — Banding decision tree (WTW GGS 4.2 §3). See docs/GGS_MODEL.md.
 * Pure & unit-tested. Answers are the tree's yes/no questions; the result is a
 * band and its career path, with the reasoning that led there.
 */

import type { BandKey, CareerPath } from "./bands";

export interface BandingAnswers {
  /** Q1: Managing people a focus? (achieves results through others) */
  managingPeopleFocus: boolean;

  // Management branch
  /** Q2: Manage professionals and/or managers? (vs. supervise clerks/operators/technicians) */
  manageProfessionalsOrManagers?: boolean;
  /** Q3: Set / significantly influence organizational FUNCTIONAL strategy? */
  setFunctionalStrategy?: boolean;
  /** Q4: Set / significantly influence BUSINESS strategy? */
  setBusinessStrategy?: boolean;
  /** Q5: CEO / Business Unit Manager? (single top job, P&L) */
  isCeo?: boolean;

  // Individual-contributor branch
  /** Q6: Specific job functional knowledge required? */
  specificFunctionalKnowledge?: boolean;
  /** Q7: Independence in applying professional expertise? */
  independentProfessionalExpertise?: boolean;
  /** Q8: Subject matter expert? */
  subjectMatterExpert?: boolean;
}

export interface BandSuggestion {
  band: BandKey;
  path: CareerPath;
  reasoning: string;
}

export function suggestBand(a: BandingAnswers): BandSuggestion {
  if (a.managingPeopleFocus) {
    // ----- Management career path -----
    if (!a.manageProfessionalsOrManagers) {
      return {
        band: "3M",
        path: "M",
        reasoning: "Supervises operators/technicians/clerks or is first-line management — Junior Management.",
      };
    }
    if (!a.setFunctionalStrategy) {
      return {
        band: "4M",
        path: "M",
        reasoning: "Manages professionals/managers but does not set functional strategy — Middle Management.",
      };
    }
    if (!a.setBusinessStrategy) {
      return {
        band: "5FS",
        path: "M",
        reasoning: "Sets/influences organizational functional strategy — Senior Management.",
      };
    }
    if (a.isCeo) {
      return {
        band: "ceo",
        path: "M",
        reasoning: "The single top job with P&L responsibility for the business unit — CEO.",
      };
    }
    return {
      band: "5BS",
      path: "M",
      reasoning: "Determines/influences business-unit strategy as a member of the executive team — Top Management.",
    };
  }

  // ----- Individual-contributor career path -----
  if (!a.specificFunctionalKnowledge) {
    return {
      band: "1",
      path: "IC",
      reasoning: "Simple, repetitive tasks with no specific training required — Manual / Junior Admin.",
    };
  }
  if (!a.independentProfessionalExpertise) {
    return {
      band: "2",
      path: "IC",
      reasoning: "Specific knowledge applied within well-defined procedures — Clerical / Administrative.",
    };
  }
  if (!a.subjectMatterExpert) {
    return {
      band: "3IC",
      path: "IC",
      reasoning: "Independently applies professional expertise and judgment — Professional.",
    };
  }
  return {
    band: "4IC",
    path: "IC",
    reasoning: "A leading expert in a subject with deep technical expertise and few peers — Subject Matter Expert.",
  };
}

/** The ordered banding questions, for driving a guided UI. */
export const BANDING_QUESTIONS = {
  managingPeopleFocus: {
    title: "Is managing people a focus?",
    objective:
      "Separate jobs focused on managing people (results through others) from those focused on individual expertise.",
  },
  manageProfessionalsOrManagers: {
    title: "Manage professionals and/or managers?",
    objective:
      "Separate managers (manage professionals/managers) from supervisors (supervise clerks/operators/technicians).",
  },
  setFunctionalStrategy: {
    title: "Set or significantly influence organizational functional strategy?",
    objective: "Separate jobs that determine or significantly impact a function's strategy.",
  },
  setBusinessStrategy: {
    title: "Set or significantly influence business strategy?",
    objective: "Separate positions that determine or significantly impact business-unit-wide strategy.",
  },
  isCeo: {
    title: "CEO / Business Unit Manager?",
    objective: "Identify the single top job with P&L responsibility for the business unit.",
  },
  specificFunctionalKnowledge: {
    title: "Specific job functional knowledge required?",
    objective: "Separate jobs that require defined knowledge/skills from those that do not.",
  },
  independentProfessionalExpertise: {
    title: "Independence in applying professional expertise?",
    objective: "Separate jobs applying professional expertise from those working within a defined framework.",
  },
  subjectMatterExpert: {
    title: "Subject matter expert?",
    objective: "Separate technical/domain experts from other professionals.",
  },
} as const;
