export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";

export async function POST(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "grading", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to grade jobs." }, { status: 403 });

  try {
    const { jobId } = await ctx.params;
    const body = await req.json();
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const jobRef = orgRef.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    const wasGraded = jobSnap.data()?.currentGrade != null;
    const title = jobSnap.data()?.title ?? "job";

    const now = Date.now();
    const evalRef = await jobRef.collection("evaluations").add({
      factorSelections: body.factorSelections ?? {},
      factorScores: body.factorScores ?? {},
      rawScore: body.rawScore ?? 0,
      rMax: body.rMax ?? 0,
      computedGrade: body.computedGrade ?? null,
      finalGrade: body.finalGrade,
      bandWindow: body.bandWindow ?? null,
      anomaly: !!body.anomaly,
      flags: body.flags ?? [],
      confidence: body.confidence ?? null,
      breakdown: body.breakdown ?? [],
      note: body.note ?? null,
      gradedBy: actor.userId,
      gradedByName: actor.displayName,
      gradedAt: now,
    });

    const jobUpdate: Record<string, unknown> = {
      careerPath: body.careerPath,
      band: body.band,
      currentGrade: body.finalGrade,
      currentEvaluationId: evalRef.id,
      confidence: body.confidence ?? null,
      flags: body.flags ?? [],
      status: body.anomaly ? "needs_review" : "graded",
      updatedAt: now,
    };
    if (typeof body.jd === "string") jobUpdate.jd = body.jd;
    if (typeof body.jobPurpose === "string") jobUpdate.jobPurpose = body.jobPurpose;
    await jobRef.update(jobUpdate);

    await logActivity(orgRef, actor, {
      type: wasGraded ? "job_regraded" : "job_graded",
      targetType: "job",
      targetId: jobId,
      summary: `${wasGraded ? "Re-graded" : "Graded"} "${title}" at grade ${body.finalGrade}`,
    });
    return NextResponse.json({ success: true, id: evalRef.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
