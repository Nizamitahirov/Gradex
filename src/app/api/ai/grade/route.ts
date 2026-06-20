export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef } from "@/lib/server/org";
import { gradeFromJD } from "@/lib/server/ai";
import { gradeJob, type FactorSelections } from "@/lib/grading/engine";
import { FACTOR_IDS } from "@/lib/grading/factors";
import { BAND_KEYS, type BandKey } from "@/lib/grading/bands";

/** AI fills the GGS questionnaire from a JD; the engine computes the grade. */
export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const jd = String(body.jd ?? "");
    if (!jd.trim()) return NextResponse.json({ success: false, error: "JD text required" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    const orgSnap = orgRef ? await orgRef.get() : null;
    const scoping = orgSnap?.data()?.scoping;
    const companyGrade = scoping?.result?.companyGrade ?? 21;
    const scopedRange = {
      lo: scoping?.result?.bottomGrade ?? 1,
      hi: scoping?.result?.topGrade ?? companyGrade,
    };

    const ai = await gradeFromJD(jd, body.title);

    // Sanitize AI output against the real catalog.
    const band: BandKey = (BAND_KEYS as string[]).includes(ai.band) ? (ai.band as BandKey) : "3IC";
    const careerPath = ai.careerPath === "M" ? "M" : "IC";
    const selections: FactorSelections = {};
    for (const id of FACTOR_IDS) {
      const v = ai.factors?.[id];
      if (typeof v === "number") selections[id] = v;
    }

    const result = gradeJob({ selections, band, careerPath, scopedRange, companyGrade });

    return NextResponse.json({
      success: true,
      band,
      careerPath,
      factors: selections,
      reasoning: ai.reasoning ?? "",
      finalGrade: result.finalGrade,
      bandWindow: result.bandWindow,
      anomaly: result.anomaly,
      confidence: result.confidence,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "AI error" }, { status: 500 });
  }
}
