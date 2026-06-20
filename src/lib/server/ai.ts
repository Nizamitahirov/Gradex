/**
 * AI service (Groq) — server-only. Powers the JD assistant and AI grading.
 * The AI fills the GGS questionnaire (band + the 7 factor levels); the
 * deterministic engine then computes the grade, so results stay explainable.
 */

import "server-only";
import Groq from "groq-sdk";
import { FACTORS } from "@/lib/grading/factors";
import { BANDS } from "@/lib/grading/bands";

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function client(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
  return new Groq({ apiKey });
}

async function chatText(system: string, user: string, temperature = 0.4): Promise<string> {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

async function chatJSON<T>(system: string, user: string): Promise<T> {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}

// --- Shared GGS context for prompts ---

function factorCatalog(): string {
  return FACTORS.map((f) => {
    const levels = f.levels.map((l) => `      ${l.index} = ${l.label}: ${l.description}`).join("\n");
    return `  ${f.id} ("${f.name}") — pick a level index 0..${f.levels.length - 1}:\n${levels}`;
  }).join("\n");
}

function bandCatalog(): string {
  return BANDS.map((b) => `  ${b.key} = ${b.code} ${b.name} (${b.path}) — ${b.description}`).join("\n");
}

// --- Public functions ---

export interface JDContext {
  title: string;
  family?: string;
  band?: string;
  careerPath?: string;
  jobPurpose?: string;
  factorSummary?: string;
  company?: string;
}

export async function generateJD(ctx: JDContext): Promise<string> {
  const system =
    "You are an expert HR job architect. Write a clear, professional Job Description in Markdown. " +
    "Use these sections: '## Job Purpose', '## Key Responsibilities' (5–8 bullets), " +
    "'## Required Knowledge & Experience', '## Skills & Competencies', and '## Scope & Impact'. " +
    "Be concise, specific and realistic. Do not invent a company name unless given one.";
  const user = [
    `Job title: ${ctx.title}`,
    ctx.company ? `Company: ${ctx.company}` : "",
    ctx.family ? `Function / family: ${ctx.family}` : "",
    ctx.band ? `GGS band: ${ctx.band}` : "",
    ctx.careerPath ? `Career path: ${ctx.careerPath}` : "",
    ctx.jobPurpose ? `Job purpose (seed): ${ctx.jobPurpose}` : "",
    ctx.factorSummary ? `Grading factor selections to reflect:\n${ctx.factorSummary}` : "",
    "\nWrite the full job description now.",
  ]
    .filter(Boolean)
    .join("\n");
  return chatText(system, user, 0.5);
}

export interface AIGradeResult {
  band: string;
  careerPath: "IC" | "M";
  factors: Record<string, number>;
  reasoning: string;
}

export async function gradeFromJD(jd: string, title?: string): Promise<AIGradeResult> {
  const system =
    "You are a job-leveling analyst applying the WTW Global Grading System (GGS). " +
    "Given a job description, choose the GGS band and a level for EACH of the seven factors. " +
    "Grade the job, not the person; assume a fully competent incumbent. " +
    "Return STRICT JSON only with this shape: " +
    '{ "band": <band key>, "careerPath": "IC"|"M", "factors": { <factorId>: <levelIndex>, ... for all 7 }, "reasoning": <2-3 sentences> }.\n\n' +
    `Bands:\n${bandCatalog()}\n\nFactors (choose a level index for each):\n${factorCatalog()}`;
  const user = `${title ? `Job title: ${title}\n\n` : ""}Job description:\n"""\n${jd.slice(0, 12000)}\n"""`;
  return chatJSON<AIGradeResult>(system, user);
}

export interface ExtractedJob {
  title: string;
  jobPurpose: string;
  family: string;
}

export async function extractJob(documentText: string): Promise<ExtractedJob> {
  const system =
    "Extract the job from this document. Return STRICT JSON: " +
    '{ "title": <job title>, "jobPurpose": <1-2 sentence purpose>, "family": <a short function/family name e.g. Finance, Engineering, Sales, HR, Operations> }.';
  const user = documentText.slice(0, 12000);
  return chatJSON<ExtractedJob>(system, user);
}

export async function rewriteJD(currentJD: string, changeSummary: string): Promise<string> {
  const system =
    "You are an expert HR job architect. Rewrite the Job Description in Markdown so it is consistent with the " +
    "updated grading-factor selections described by the user. Keep the same section structure " +
    "('## Job Purpose', '## Key Responsibilities', '## Required Knowledge & Experience', '## Skills & Competencies', '## Scope & Impact'). " +
    "Preserve correct facts; adjust scope, seniority and responsibilities to match the changes.";
  const user = `Updated factor selections:\n${changeSummary}\n\nCurrent job description:\n"""\n${currentJD.slice(0, 12000)}\n"""\n\nReturn the full revised job description.`;
  return chatText(system, user, 0.5);
}

export async function compareStructures(a: { name: string; rows: unknown }, b: { name: string; rows: unknown }): Promise<string> {
  const system =
    "You are a Total Rewards / compensation consultant. Compare two pay structures (grade tables) and " +
    "produce a concise, decision-useful analysis in Markdown with sections: '## Summary', " +
    "'## Key differences' (bullets: midpoint progression, range spread, competitiveness, cost implications), " +
    "'## Risks & considerations', and '## Recommendation'. Reference grades and figures where useful.";
  const user = `Structure A — ${a.name}:\n${JSON.stringify(a.rows).slice(0, 6000)}\n\nStructure B — ${b.name}:\n${JSON.stringify(b.rows).slice(0, 6000)}`;
  return chatText(system, user, 0.4);
}

export async function payInsights(summary: string): Promise<string> {
  const system =
    "You are a Total Rewards analyst. Given workforce pay-vs-structure statistics, write a sharp executive " +
    "narrative in Markdown with sections: '## Headlines', '## Pay competitiveness', '## Pay equity', " +
    "'## Cost to remediate', and '## Recommended actions' (prioritized bullets). Be specific and reference the numbers.";
  return chatText(system, `Workforce analysis summary:\n${summary}`, 0.4);
}
