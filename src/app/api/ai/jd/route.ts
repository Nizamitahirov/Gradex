export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/server/org";
import { generateJD, rewriteJD } from "@/lib/server/ai";

/** Generate a JD, or rewrite one (when `currentJD` + `changeSummary` are given). */
export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    let jd: string;
    if (body.mode === "rewrite") {
      jd = await rewriteJD(String(body.currentJD ?? ""), String(body.changeSummary ?? ""));
    } else {
      jd = await generateJD({
        title: body.title,
        family: body.family,
        band: body.band,
        careerPath: body.careerPath,
        jobPurpose: body.jobPurpose,
        factorSummary: body.factorSummary,
        company: body.company,
      });
    }
    return NextResponse.json({ success: true, jd });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "AI error" }, { status: 500 });
  }
}
