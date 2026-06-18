export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getActor, getPrimaryOrgRef } from "@/lib/server/org";
import { extractJob, gradeFromJD } from "@/lib/server/ai";
import { gradeJob, type FactorSelections } from "@/lib/grading/engine";
import { FACTOR_IDS } from "@/lib/grading/factors";
import { BAND_KEYS, type BandKey } from "@/lib/grading/bands";

/** AI-extract + grade a batch of uploaded JD documents (already parsed to text). */
export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const files: { filename: string; text: string }[] = (body.files ?? []).slice(0, 20);
    if (!files.length) return NextResponse.json({ success: false, error: "No files" }, { status: 400 });

    const orgRef = await getPrimaryOrgRef();
    const orgSnap = orgRef ? await orgRef.get() : null;
    const scoping = orgSnap?.data()?.scoping;
    const companyGrade = scoping?.result?.companyGrade ?? 21;
    const scopedRange = { lo: scoping?.result?.bottomGrade ?? 1, hi: scoping?.result?.topGrade ?? companyGrade };

    const proposals = [];
    for (const f of files) {
      if (!f.text?.trim()) continue;
      try {
        const [meta, ai] = await Promise.all([extractJob(f.text), gradeFromJD(f.text, f.filename)]);
        const band: BandKey = (BAND_KEYS as string[]).includes(ai.band) ? (ai.band as BandKey) : "3IC";
        const careerPath = ai.careerPath === "M" ? "M" : "IC";
        const selections: FactorSelections = {};
        for (const id of FACTOR_IDS) {
          const v = ai.factors?.[id];
          if (typeof v === "number") selections[id] = v;
        }
        const result = gradeJob({ selections, band, careerPath, scopedRange, companyGrade });
        proposals.push({
          filename: f.filename,
          title: meta.title || f.filename.replace(/\.[^.]+$/, ""),
          family: meta.family || "General",
          jobPurpose: meta.jobPurpose || "",
          jd: f.text,
          band,
          careerPath,
          factors: selections,
          reasoning: ai.reasoning ?? "",
          finalGrade: result.finalGrade,
          confidence: result.confidence,
          anomaly: result.anomaly,
        });
      } catch (e) {
        proposals.push({ filename: f.filename, error: e instanceof Error ? e.message : "Failed" });
      }
    }

    return NextResponse.json({ success: true, proposals, companyGrade, scopedRange });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "AI error" }, { status: 500 });
  }
}
