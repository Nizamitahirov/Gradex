/**
 * Workforce / Total Rewards analytics — compares real employee pay against a
 * pay structure. Pure functions, run client-side (employee PII never leaves
 * the browser).
 */

import { placeSalary, type PayRow, type RangePlacement } from "./scale";
import { getBand, type BandKey } from "@/lib/grading/bands";
import type { Job } from "@/types";

export interface EmployeeInput {
  badge?: string;
  name?: string;
  department?: string;
  division?: string;
  team?: string;
  position?: string;
  startDate?: string;
  birthDate?: string;
  gender?: string;
  grossSalary?: number;
}

export interface AssignedEmployee extends EmployeeInput {
  id: string;
  salary: number;
  grade: number | null;
  band: BandKey | null;
  bandName: string | null;
  careerPath: "IC" | "M" | null;
  matchedJobTitle: string | null;
  placement: RangePlacement | null;
  costToMin: number; // to LD
  costToMid: number; // to Median
  tenureYears: number | null;
  age: number | null;
  genderNorm: "Male" | "Female" | "Other" | null;
}

function norm(s?: string) {
  return (s ?? "").trim().toLowerCase();
}

function yearsSince(date?: string): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, (Date.now() - d.getTime()) / (365.25 * 864e5));
}

function normGender(g?: string): AssignedEmployee["genderNorm"] {
  const v = norm(g);
  if (["m", "male", "kişi", "kisi"].includes(v)) return "Male";
  if (["f", "female", "qadın", "qadin", "w", "woman"].includes(v)) return "Female";
  return v ? "Other" : null;
}

/** Match each employee to a graded job by position title, then place their pay. */
export function assignEmployees(
  employees: EmployeeInput[],
  jobs: Job[],
  rows: PayRow[],
): AssignedEmployee[] {
  const rowByGrade = new Map(rows.map((r) => [r.grade, r]));
  const gradedJobs = jobs.filter((j) => j.currentGrade != null);
  const byTitle = new Map<string, Job>();
  for (const j of gradedJobs) byTitle.set(norm(j.title), j);

  return employees.map((e, i) => {
    const salary = Number(e.grossSalary) || 0;
    const pos = norm(e.position);
    let job: Job | undefined = byTitle.get(pos);
    if (!job && pos) {
      // fuzzy: position contains job title or vice-versa
      job = gradedJobs.find((j) => {
        const t = norm(j.title);
        return t && (pos.includes(t) || t.includes(pos));
      });
    }
    const grade = job?.currentGrade ?? null;
    const row = grade != null ? rowByGrade.get(grade) : undefined;
    const placement = row ? placeSalary(salary, row) : null;
    const band = (job?.band as BandKey) ?? null;
    return {
      ...e,
      id: e.badge || `emp-${i}`,
      salary,
      grade,
      band,
      bandName: band ? getBand(band).name : null,
      careerPath: job?.careerPath ?? null,
      matchedJobTitle: job?.title ?? null,
      placement,
      costToMin: row && placement?.status === "underpaid" ? Math.max(0, row.ld - salary) : 0,
      costToMid: row ? Math.max(0, row.median - salary) : 0,
      tenureYears: yearsSince(e.startDate),
      age: e.birthDate ? yearsSince(e.birthDate) : null,
      genderNorm: normGender(e.gender),
    };
  });
}

export interface Bucket {
  label: string;
  value: number;
  extra?: number;
}

export interface PayAnalysis {
  headcount: number;
  assigned: number;
  unassigned: number;
  totalCost: number;
  avgSalary: number;
  medianSalary: number;
  underpaid: number;
  overpaid: number;
  meets: number;
  budgetToMin: number;
  budgetToMid: number;
  avgCompaRatio: number;
  genderPayGapMean: number; // % (male vs female mean)
  genderPayGapMedian: number;
  byGrade: { grade: number; count: number; avgSalary: number; median: number; avgCompa: number }[];
  byBand: Bucket[];
  byGender: { label: string; count: number; avgSalary: number }[];
  byDepartment: { label: string; count: number; avgSalary: number }[];
  compaDistribution: Bucket[];
  quartileDistribution: Bucket[];
  tenureGroups: Bucket[];
  ageGroups: Bucket[];
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export function analyzeWorkforce(emps: AssignedEmployee[], rows: PayRow[]): PayAnalysis {
  const assigned = emps.filter((e) => e.grade != null);
  const salaries = emps.map((e) => e.salary).filter((s) => s > 0);

  const males = assigned.filter((e) => e.genderNorm === "Male").map((e) => e.salary);
  const females = assigned.filter((e) => e.genderNorm === "Female").map((e) => e.salary);
  const gapMean = males.length && females.length ? ((avg(males) - avg(females)) / avg(males)) * 100 : 0;
  const gapMedian = males.length && females.length ? ((median(males) - median(females)) / median(males)) * 100 : 0;

  const grades = [...new Set(assigned.map((e) => e.grade!))].sort((a, b) => b - a);
  const byGrade = grades.map((g) => {
    const list = assigned.filter((e) => e.grade === g);
    return {
      grade: g,
      count: list.length,
      avgSalary: Math.round(avg(list.map((e) => e.salary))),
      median: Math.round(median(list.map((e) => e.salary))),
      avgCompa: Math.round(avg(list.map((e) => e.placement?.compaRatio ?? 0)) * 100) / 100,
    };
  });

  const group = (key: (e: AssignedEmployee) => string | null) => {
    const m = new Map<string, AssignedEmployee[]>();
    for (const e of assigned) {
      const k = key(e);
      if (!k) continue;
      (m.get(k) ?? m.set(k, []).get(k)!).push(e);
    }
    return Array.from(m.entries()).map(([label, list]) => ({
      label,
      count: list.length,
      avgSalary: Math.round(avg(list.map((e) => e.salary))),
    }));
  };

  const compaBuckets = [
    { label: "< 80%", lo: -Infinity, hi: 0.8 },
    { label: "80–90%", lo: 0.8, hi: 0.9 },
    { label: "90–110%", lo: 0.9, hi: 1.1 },
    { label: "110–120%", lo: 1.1, hi: 1.2 },
    { label: "> 120%", lo: 1.2, hi: Infinity },
  ].map((b) => ({
    label: b.label,
    value: assigned.filter((e) => (e.placement?.compaRatio ?? 0) >= b.lo && (e.placement?.compaRatio ?? 0) < b.hi).length,
  }));

  const zones = ["below", "Q1", "Q2", "Q3", "Q4", "above"] as const;
  const zoneLabel: Record<string, string> = { below: "Below min", Q1: "Q1", Q2: "Q2", Q3: "Q3", Q4: "Q4", above: "Above max" };
  const quartileDistribution = zones.map((z) => ({
    label: zoneLabel[z],
    value: assigned.filter((e) => e.placement?.zone === z).length,
  }));

  const tenureBuckets = [
    { label: "< 1 yr", lo: 0, hi: 1 },
    { label: "1–3", lo: 1, hi: 3 },
    { label: "3–5", lo: 3, hi: 5 },
    { label: "5–10", lo: 5, hi: 10 },
    { label: "10+", lo: 10, hi: Infinity },
  ].map((b) => ({
    label: b.label,
    value: assigned.filter((e) => e.tenureYears != null && e.tenureYears >= b.lo && e.tenureYears < b.hi).length,
    extra: Math.round(avg(assigned.filter((e) => e.tenureYears != null && e.tenureYears >= b.lo && e.tenureYears < b.hi).map((e) => e.salary))),
  }));

  const ageBuckets = [
    { label: "< 30", lo: 0, hi: 30 },
    { label: "30–39", lo: 30, hi: 40 },
    { label: "40–49", lo: 40, hi: 50 },
    { label: "50+", lo: 50, hi: Infinity },
  ].map((b) => ({
    label: b.label,
    value: assigned.filter((e) => e.age != null && e.age >= b.lo && e.age < b.hi).length,
    extra: Math.round(avg(assigned.filter((e) => e.age != null && e.age >= b.lo && e.age < b.hi).map((e) => e.salary))),
  }));

  return {
    headcount: emps.length,
    assigned: assigned.length,
    unassigned: emps.length - assigned.length,
    totalCost: Math.round(salaries.reduce((a, b) => a + b, 0)),
    avgSalary: Math.round(avg(salaries)),
    medianSalary: Math.round(median(salaries)),
    underpaid: assigned.filter((e) => e.placement?.status === "underpaid").length,
    overpaid: assigned.filter((e) => e.placement?.status === "overpaid").length,
    meets: assigned.filter((e) => e.placement?.status === "meets").length,
    budgetToMin: Math.round(assigned.reduce((a, e) => a + e.costToMin, 0)),
    budgetToMid: Math.round(assigned.reduce((a, e) => a + e.costToMid, 0)),
    avgCompaRatio: Math.round(avg(assigned.map((e) => e.placement?.compaRatio ?? 0)) * 100) / 100,
    genderPayGapMean: Math.round(gapMean * 10) / 10,
    genderPayGapMedian: Math.round(gapMedian * 10) / 10,
    byGrade,
    byBand: group((e) => e.bandName).map((b) => ({ label: b.label, value: b.count, extra: b.avgSalary })),
    byGender: group((e) => e.genderNorm),
    byDepartment: group((e) => e.department ?? null).sort((a, b) => b.count - a.count).slice(0, 10),
    compaDistribution: compaBuckets,
    quartileDistribution,
    tenureGroups: tenureBuckets,
    ageGroups: ageBuckets,
  };
}
