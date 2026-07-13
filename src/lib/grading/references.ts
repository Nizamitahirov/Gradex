/**
 * PDF references — maps each GGS element (scope inputs, banding, factors) to its
 * place in the WTW GGS 4.2 User Guide, with a short citation and the detailed
 * principle. Surfaced in the evaluation UI so users can see where each element
 * comes from ("istinada detallı bax"). Detail text is a faithful summary of the
 * guide's own wording (not verbatim reproduction of the proprietary document).
 */

import type { FactorId } from "./factors";

export interface PdfRef {
  /** Short citation, e.g. "GGS 4.2 · §4.1 · s.40". */
  cite: string;
  section: string;
  page: number;
  /** The detailed principle behind this element. */
  detail: string;
}

export const FACTOR_REFERENCES: Record<FactorId, PdfRef> = {
  functionalKnowledge: {
    cite: "GGS 4.2 · §4 · s.40",
    section: "§4 — Job Functional Knowledge",
    page: 40,
    detail:
      "Measures the requirement for knowledge of functional work and activities, through a hierarchy: tasks (single-step) → procedures (multi-step) → principles (choice of procedures within categories) → theory & practice (professional-level knowledge of a discipline). Here 'discipline' means technical expertise in a subject area — not business functioning, which the Business Expertise factor covers. At the high end it concentrates on the complexity of the functional knowledge, not merely the amount.",
  },
  businessExpertise: {
    cite: "GGS 4.2 · §4 · s.40",
    section: "§4 — Business Expertise",
    page: 40,
    detail:
      "Measures the job's requirement for knowledge and expertise about the business itself (rather than technical expertise). It moves from understanding the activities of the team → the function → the broader business unit → the commercial environment/industry. It relates to the job's position in the hierarchy, but that should not be taken as a universal rule.",
  },
  leadership: {
    cite: "GGS 4.2 · §4 · s.40",
    section: "§4 — Leadership",
    page: 40,
    detail:
      "Measures the requirement to provide leadership and guidance to others — the nature and breadth of that leadership. It measures 'authority' level and the increasing complexity of exercising authority in diverse, wide-spread organizations. It also captures the informal authority invested in Individual Contributor roles through the role-modelling expected at higher levels.",
  },
  problemSolving: {
    cite: "GGS 4.2 · §4 · s.41",
    section: "§4 — Problem Solving",
    page: 41,
    detail:
      "Measures the level of mental skills required and the complexity of typical problems — separated into analysis, judgement and decision-making. It also examines the amount and type of defined 'structure' present for the job to rely upon when solving problems.",
  },
  natureOfImpact: {
    cite: "GGS 4.2 · §4 · s.41",
    section: "§4 — Nature of Impact",
    page: 41,
    detail:
      "Measures how the job affects the business by measuring the overall responsibility associated with it, focusing on the direct contribution required: from tangential support of other activities → accuracy of input → quality of input (accuracy and influence) → shared accountability → primary operational and strategic responsibility. Avoid focusing on impact-of-error — always assume the role is performed competently.",
  },
  areaOfImpact: {
    cite: "GGS 4.2 · §4 · s.41",
    section: "§4 — Area of Impact",
    page: 41,
    detail:
      "Measures where the job's impact is felt across organizational entities (organization segment and size). It tends to associate with the job's position on the org chart, but that should not be the only guide. Staff functions (Finance, HR) can cut across the whole organization, so this factor must be levelled together with Nature of Impact. Avoid impact-of-error focus; assume competent performance.",
  },
  interpersonalSkills: {
    cite: "GGS 4.2 · §4 · s.41",
    section: "§4 — Interpersonal Skills",
    page: 41,
    detail:
      "Measures the level and type of 'people skills' normally required to perform the role, judged on interaction with others over and above superior/subordinate exchanges. Only true, ongoing and regular requirements of the job should drive the selection — incidental interactions are not considered.",
  },
};

export const BANDING_REFERENCE: PdfRef = {
  cite: "GGS 4.2 · §3 · s.30",
  section: "§3 — Banding decision tree",
  page: 30,
  detail:
    "Step 2 places the job in a band using the banding decision tree. The first split is whether managing people is a focus (achieving results through others). The management branch separates supervisors (3M) from middle managers (4M), then those who set functional strategy (5FS), business strategy (5BS) and the single P&L-holding CEO. The individual-contributor branch separates roles by whether specific functional knowledge is required (Band 1 vs 2), independent professional expertise (3IC) and subject-matter expertise (4IC).",
};

export const BAND_REFERENCE: PdfRef = {
  cite: "GGS 4.2 · §4.2–4.9 · s.42",
  section: "§4.2–4.9 — Band factor level definitions",
  page: 42,
  detail:
    "Each band has its own factor level definitions (§4.2 Band 1 … §4.9 Band 4IC). A job is evaluated only against the level set defined for its band, so the number and meaning of levels for each factor changes from band to band (typically 2–4 levels per factor). The selected levels place the job at a global grade within the band's grade window.",
};

export const GRADE_MAP_REFERENCE: PdfRef = {
  cite: "GGS 4.2 · Grade Map · s.18",
  section: "Grade Maps — band ↔ grade ranges",
  page: 18,
  detail:
    "The Grade Maps show which bands and grades are available for each Company (CEO) Grade. The CEO sits at the Company Grade; bands occupy contiguous grade ranges below it. Ranges for the upper bands (4IC, 4M, 5FS, 5BS) shift with company size ('grade shift'), while the lower bands are more stable. Gradex's band grade windows follow the Company-Grade-20 grade map (page 18) and shift for other company grades.",
};

export const SCOPING_REFERENCES = {
  companyGrade: {
    cite: "GGS 4.2 · §2 · s.9",
    section: "§2 — Business Analysis → Company Grade",
    page: 9,
    detail:
      "Step 1 sets the Company (CEO) Grade — between 16 and 25 — as the rounded average of three Scope Grades: Revenue, FTE Employees, and Diversity/Complexity × Geographic Breadth. This grade is the ceiling for the business unit and anchors the grade maps.",
  } as PdfRef,
  revenue: {
    cite: "GGS 4.2 · §2.4 · s.10",
    section: "§2.4 — Business Size (Revenue)",
    page: 10,
    detail:
      "Annual revenue maps to a Scope Grade (16–25) via the GGS revenue-size thresholds. Revenue is one of the key scope dimensions used to size the business unit.",
  } as PdfRef,
  fte: {
    cite: "GGS 4.2 · §2.5 · s.11",
    section: "§2.5 — Business Size (FTE Employees)",
    page: 11,
    detail:
      "Full-time-equivalent employee count maps to a Scope Grade (16–25) via the GGS FTE thresholds — a second scope dimension used to size the business unit.",
  } as PdfRef,
  dcGeo: {
    cite: "GGS 4.2 · §2.3 · s.9",
    section: "§2.3 — Diversity/Complexity × Geographic Breadth",
    page: 9,
    detail:
      "Business Diversity/Complexity (Low/Medium/High) combined with Geographic Breadth (Domestic/International/Global) yields a Scope Grade via the GGS matrix — the qualitative scope dimension used alongside Revenue and FTE.",
  } as PdfRef,
};
