/**
 * Demo seed data — SPEC.md §18.
 *
 * Builds one fully-graded demo org (~4 families, ~25 jobs across bands/grades)
 * so the structure grid and dashboards look alive immediately. Grades are
 * computed with the real grading engine so the data is internally consistent.
 */

import { computeScoping } from "@/lib/scoping";
import { gradeJob, type FactorSelections } from "@/lib/grading/engine";
import type { BandKey, CareerPath } from "@/lib/grading/bands";
import type { Activity, Evaluation, Family, Job, Member, Org } from "@/types";

export const DEMO_USER = {
  uid: "demo-user",
  email: "analyst@acme.example",
  displayName: "Demo Analyst",
  photoURL: null as string | null,
};

export interface SeededData {
  org: Org;
  families: Family[];
  jobs: Job[];
  evaluations: Evaluation[];
  members: Member[];
  activity: Activity[];
}

interface JobSpec {
  title: string;
  family: string; // family key
  path: CareerPath;
  band: BandKey;
  sel: FactorSelections;
}

// A spread of jobs across families, bands and grades.
const SPECS: JobSpec[] = [
  // Engineering
  { title: "Software Engineering Intern", family: "eng", path: "IC", band: "para_professional", sel: { functionalKnowledge: 1, businessExpertise: 0, leadership: 0, problemSolving: 1, natureOfImpact: 0, areaOfImpact: 0, interpersonalSkills: 0 } },
  { title: "Software Engineer", family: "eng", path: "IC", band: "professional", sel: { functionalKnowledge: 3, businessExpertise: 1, leadership: 0, problemSolving: 2, natureOfImpact: 1, areaOfImpact: 1, interpersonalSkills: 1 } },
  { title: "Senior Software Engineer", family: "eng", path: "IC", band: "professional", sel: { functionalKnowledge: 4, businessExpertise: 2, leadership: 1, problemSolving: 3, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 1 } },
  { title: "Principal Engineer", family: "eng", path: "IC", band: "expert", sel: { functionalKnowledge: 5, businessExpertise: 3, leadership: 1, problemSolving: 4, natureOfImpact: 3, areaOfImpact: 3, interpersonalSkills: 3 } },
  { title: "Engineering Manager", family: "eng", path: "M", band: "manager", sel: { functionalKnowledge: 4, businessExpertise: 2, leadership: 3, problemSolving: 3, natureOfImpact: 2, areaOfImpact: 3, interpersonalSkills: 2 } },
  { title: "VP of Engineering", family: "eng", path: "M", band: "director", sel: { functionalKnowledge: 5, businessExpertise: 3, leadership: 5, problemSolving: 4, natureOfImpact: 3, areaOfImpact: 4, interpersonalSkills: 3 } },

  // Finance
  { title: "Accounts Payable Clerk", family: "fin", path: "IC", band: "clerical", sel: { functionalKnowledge: 1, businessExpertise: 0, leadership: 0, problemSolving: 0, natureOfImpact: 0, areaOfImpact: 0, interpersonalSkills: 0 } },
  { title: "Financial Analyst", family: "fin", path: "IC", band: "professional", sel: { functionalKnowledge: 3, businessExpertise: 2, leadership: 0, problemSolving: 2, natureOfImpact: 1, areaOfImpact: 2, interpersonalSkills: 1 } },
  { title: "Senior Financial Analyst", family: "fin", path: "IC", band: "professional", sel: { functionalKnowledge: 4, businessExpertise: 3, leadership: 1, problemSolving: 3, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 2 } },
  { title: "Finance Manager", family: "fin", path: "M", band: "manager", sel: { functionalKnowledge: 4, businessExpertise: 3, leadership: 3, problemSolving: 3, natureOfImpact: 2, areaOfImpact: 3, interpersonalSkills: 2 } },
  { title: "Director of Finance", family: "fin", path: "M", band: "director", sel: { functionalKnowledge: 4, businessExpertise: 4, leadership: 4, problemSolving: 3, natureOfImpact: 3, areaOfImpact: 4, interpersonalSkills: 3 } },
  { title: "Chief Financial Officer", family: "fin", path: "M", band: "executive", sel: { functionalKnowledge: 5, businessExpertise: 4, leadership: 5, problemSolving: 4, natureOfImpact: 4, areaOfImpact: 4, interpersonalSkills: 4 } },

  // Sales
  { title: "Sales Development Rep", family: "sales", path: "IC", band: "para_professional", sel: { functionalKnowledge: 1, businessExpertise: 1, leadership: 0, problemSolving: 1, natureOfImpact: 1, areaOfImpact: 1, interpersonalSkills: 1 } },
  { title: "Account Executive", family: "sales", path: "IC", band: "professional", sel: { functionalKnowledge: 2, businessExpertise: 2, leadership: 0, problemSolving: 2, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 2 } },
  { title: "Sales Team Lead", family: "sales", path: "M", band: "supervisory", sel: { functionalKnowledge: 2, businessExpertise: 2, leadership: 2, problemSolving: 2, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 3 } },
  { title: "Regional Sales Manager", family: "sales", path: "M", band: "manager", sel: { functionalKnowledge: 3, businessExpertise: 3, leadership: 3, problemSolving: 2, natureOfImpact: 3, areaOfImpact: 3, interpersonalSkills: 3 } },
  { title: "VP of Sales", family: "sales", path: "M", band: "director", sel: { functionalKnowledge: 3, businessExpertise: 4, leadership: 5, problemSolving: 3, natureOfImpact: 3, areaOfImpact: 4, interpersonalSkills: 4 } },

  // People / HR
  { title: "HR Coordinator", family: "people", path: "IC", band: "clerical", sel: { functionalKnowledge: 2, businessExpertise: 1, leadership: 0, problemSolving: 1, natureOfImpact: 0, areaOfImpact: 1, interpersonalSkills: 1 } },
  { title: "HR Business Partner", family: "people", path: "IC", band: "professional", sel: { functionalKnowledge: 3, businessExpertise: 2, leadership: 1, problemSolving: 2, natureOfImpact: 1, areaOfImpact: 2, interpersonalSkills: 3 } },
  { title: "Compensation Analyst", family: "people", path: "IC", band: "professional", sel: { functionalKnowledge: 3, businessExpertise: 2, leadership: 0, problemSolving: 3, natureOfImpact: 2, areaOfImpact: 2, interpersonalSkills: 2 } },
  { title: "People Operations Manager", family: "people", path: "M", band: "manager", sel: { functionalKnowledge: 3, businessExpertise: 3, leadership: 3, problemSolving: 2, natureOfImpact: 2, areaOfImpact: 3, interpersonalSkills: 3 } },
  { title: "Chief People Officer", family: "people", path: "M", band: "executive", sel: { functionalKnowledge: 4, businessExpertise: 4, leadership: 5, problemSolving: 3, natureOfImpact: 3, areaOfImpact: 4, interpersonalSkills: 4 } },

  // Operations
  { title: "Warehouse Operative", family: "ops", path: "IC", band: "manual", sel: { functionalKnowledge: 0, businessExpertise: 0, leadership: 0, problemSolving: 0, natureOfImpact: 0, areaOfImpact: 0, interpersonalSkills: 0 } },
  { title: "Operations Analyst", family: "ops", path: "IC", band: "professional", sel: { functionalKnowledge: 3, businessExpertise: 2, leadership: 0, problemSolving: 2, natureOfImpact: 1, areaOfImpact: 2, interpersonalSkills: 1 } },
  { title: "Chief Executive Officer", family: "ops", path: "M", band: "ceo", sel: { functionalKnowledge: 5, businessExpertise: 4, leadership: 5, problemSolving: 4, natureOfImpact: 4, areaOfImpact: 5, interpersonalSkills: 4 } },
];

const FAMILY_DEFS = [
  { key: "eng", name: "Engineering", color: "#6E56CF", description: "Builds and operates the product." },
  { key: "fin", name: "Finance", color: "#3B82F6", description: "Accounting, planning and treasury." },
  { key: "sales", name: "Sales", color: "#10B981", description: "Revenue generation and account growth." },
  { key: "people", name: "People & HR", color: "#F59E0B", description: "Talent, reward and culture." },
  { key: "ops", name: "Operations", color: "#EC4899", description: "Runs day-to-day business operations." },
];

export function buildSeed(now = Date.now()): SeededData {
  const orgId = "demo-org";
  const inputs = {
    revenue: 3_000_000_000,
    currency: "USD",
    headcount: 8_000,
    geoBreadth: "national" as const,
    complexity: "multiple" as const,
    industry: "Technology",
  };
  const result = computeScoping(inputs);
  const scopedRange = { lo: result.bottomGrade, hi: result.topGrade };

  const org: Org = {
    id: orgId,
    name: "Acme Corporation",
    slug: "acme",
    logoURL: null,
    industry: "Technology",
    currency: "USD",
    createdBy: DEMO_USER.uid,
    createdAt: now - 1000 * 60 * 60 * 24 * 30,
    updatedAt: now,
    scoping: { inputs, result, completed: true, completedAt: now - 1000 * 60 * 60 * 24 * 29 },
  };

  const families: Family[] = FAMILY_DEFS.map((f, i) => ({
    id: `fam-${f.key}`,
    name: f.name,
    key: f.key,
    description: f.description,
    color: f.color,
    jobCount: SPECS.filter((s) => s.family === f.key).length,
    createdAt: now - 1000 * 60 * 60 * 24 * (28 - i),
    updatedAt: now,
  }));

  const jobs: Job[] = [];
  const evaluations: Evaluation[] = [];

  SPECS.forEach((spec, i) => {
    const res = gradeJob({
      selections: spec.sel,
      band: spec.band,
      careerPath: spec.path,
      scopedRange,
    });
    const jobId = `job-${i}`;
    const evalId = `eval-${i}`;
    const gradedAt = now - 1000 * 60 * 60 * (SPECS.length - i);
    const status = res.anomaly ? "needs_review" : "graded";

    evaluations.push({
      id: evalId,
      factorSelections: spec.sel as Record<string, number>,
      factorScores: res.factorScores,
      rawScore: res.rawScore,
      rMax: res.rMax,
      computedGrade: res.computedGrade,
      finalGrade: res.finalGrade,
      bandWindow: res.bandWindow,
      anomaly: res.anomaly,
      flags: res.flags,
      confidence: res.confidence,
      breakdown: res.breakdown,
      gradedBy: DEMO_USER.uid,
      gradedByName: DEMO_USER.displayName,
      gradedAt,
    });

    jobs.push({
      id: jobId,
      title: spec.title,
      familyId: `fam-${spec.family}`,
      careerPath: spec.path,
      band: spec.band,
      description: "",
      reportsToJobId: null,
      currentGrade: res.finalGrade,
      currentEvaluationId: evalId,
      confidence: res.confidence,
      flags: res.flags,
      status,
      createdBy: DEMO_USER.uid,
      createdAt: gradedAt - 1000 * 60,
      updatedAt: gradedAt,
    });
  });

  const members: Member[] = [
    {
      userId: DEMO_USER.uid,
      email: DEMO_USER.email,
      displayName: DEMO_USER.displayName,
      role: "admin",
      joinedAt: org.createdAt,
      status: "active",
    },
  ];

  const activity: Activity[] = [
    {
      id: "act-scope",
      type: "scoping_completed",
      actorId: DEMO_USER.uid,
      actorName: DEMO_USER.displayName,
      summary: `Completed scoping — grades ${result.bottomGrade}–${result.topGrade}, CEO at ${result.topGrade}`,
      createdAt: org.scoping!.completedAt!,
    },
    ...jobs.slice(-6).map((j) => ({
      id: `act-${j.id}`,
      type: "job_graded",
      actorId: DEMO_USER.uid,
      actorName: DEMO_USER.displayName,
      targetType: "job",
      targetId: j.id,
      summary: `Graded "${j.title}" at grade ${j.currentGrade}`,
      createdAt: j.updatedAt,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  return { org, families, jobs, evaluations, members, activity };
}
