/**
 * Demo seed data — built with the real GGS engines so it is internally
 * consistent with the WTW GGS 4.2 model (see docs/GGS_MODEL.md).
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
  family: string;
  path: CareerPath;
  band: BandKey;
  sel: FactorSelections;
}

// selections: [functionalKnowledge, businessExpertise, leadership, problemSolving, natureOfImpact, areaOfImpact, interpersonalSkills]
const s = (
  fk: number, be: number, ld: number, ps: number, ni: number, ai: number, ip: number,
): FactorSelections => ({
  functionalKnowledge: fk, businessExpertise: be, leadership: ld, problemSolving: ps,
  natureOfImpact: ni, areaOfImpact: ai, interpersonalSkills: ip,
});

const SPECS: JobSpec[] = [
  // Engineering
  { title: "Facilities Operative", family: "eng", path: "IC", band: "1", sel: s(0, 0, 0, 0, 0, 0, 0) },
  { title: "QA Technician", family: "eng", path: "IC", band: "2", sel: s(2, 1, 0, 1, 1, 1, 1) },
  { title: "Software Engineer", family: "eng", path: "IC", band: "3IC", sel: s(3, 2, 1, 2, 2, 2, 2) },
  { title: "Principal Engineer", family: "eng", path: "IC", band: "4IC", sel: s(5, 3, 1, 4, 3, 4, 3) },
  { title: "Engineering Team Lead", family: "eng", path: "M", band: "3M", sel: s(3, 2, 2, 2, 2, 2, 3) },
  { title: "Engineering Manager", family: "eng", path: "M", band: "4M", sel: s(4, 3, 3, 3, 3, 3, 3) },
  { title: "VP of Engineering", family: "eng", path: "M", band: "5FS", sel: s(5, 4, 4, 4, 4, 4, 4) },

  // Finance
  { title: "Accounts Payable Clerk", family: "fin", path: "IC", band: "2", sel: s(1, 1, 0, 1, 1, 0, 1) },
  { title: "Financial Analyst", family: "fin", path: "IC", band: "3IC", sel: s(3, 2, 0, 2, 2, 2, 2) },
  { title: "Compensation Specialist", family: "fin", path: "IC", band: "4IC", sel: s(4, 3, 1, 3, 3, 3, 3) },
  { title: "Finance Manager", family: "fin", path: "M", band: "4M", sel: s(4, 3, 3, 3, 3, 3, 3) },
  { title: "Chief Financial Officer", family: "fin", path: "M", band: "5BS", sel: s(5, 4, 5, 4, 4, 5, 5) },

  // Sales
  { title: "Sales Development Rep", family: "sales", path: "IC", band: "2", sel: s(1, 1, 0, 1, 1, 1, 2) },
  { title: "Account Executive", family: "sales", path: "IC", band: "3IC", sel: s(2, 2, 0, 2, 2, 2, 3) },
  { title: "Sales Team Lead", family: "sales", path: "M", band: "3M", sel: s(2, 2, 2, 2, 2, 2, 3) },
  { title: "Regional Sales Manager", family: "sales", path: "M", band: "4M", sel: s(3, 3, 3, 3, 3, 3, 4) },
  { title: "VP of Sales", family: "sales", path: "M", band: "5FS", sel: s(3, 4, 4, 3, 4, 4, 5) },

  // People / HR
  { title: "HR Coordinator", family: "people", path: "IC", band: "2", sel: s(2, 1, 0, 1, 1, 1, 2) },
  { title: "HR Business Partner", family: "people", path: "IC", band: "3IC", sel: s(3, 2, 1, 2, 2, 3, 3) },
  { title: "People Operations Manager", family: "people", path: "M", band: "4M", sel: s(3, 3, 3, 2, 3, 3, 3) },
  { title: "Chief People Officer", family: "people", path: "M", band: "5BS", sel: s(4, 4, 5, 3, 4, 5, 5) },

  // Operations
  { title: "Warehouse Operative", family: "ops", path: "IC", band: "1", sel: s(0, 0, 0, 0, 0, 0, 0) },
  { title: "Operations Analyst", family: "ops", path: "IC", band: "3IC", sel: s(3, 2, 0, 2, 2, 2, 1) },
  { title: "Operations Supervisor", family: "ops", path: "M", band: "3M", sel: s(2, 2, 2, 2, 2, 2, 2) },
  { title: "Chief Operating Officer", family: "ops", path: "M", band: "5BS", sel: s(4, 4, 5, 4, 4, 5, 5) },
  { title: "Chief Executive Officer", family: "ops", path: "M", band: "ceo", sel: s(5, 4, 5, 4, 4, 5, 5) },
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
    revenueMillions: 3_000, // $3B
    currency: "USD",
    fteEmployees: 8_000,
    geographicBreadth: "international" as const,
    diversityComplexity: "medium" as const,
    industry: "Technology",
  };
  const result = computeScoping(inputs);
  const scopedRange = { lo: result.bottomGrade, hi: result.topGrade };

  const org: Org = {
    id: orgId,
    name: "Databyte LLC",
    slug: "databyte",
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
    jobCount: SPECS.filter((sp) => sp.family === f.key).length,
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
      companyGrade: result.companyGrade,
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
      summary: `Completed scoping — Company Grade ${result.companyGrade} (CEO), grades 1–${result.topGrade}`,
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
