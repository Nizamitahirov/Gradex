export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jobs", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to create jobs." }, { status: 403 });

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const familyId = String(body.familyId ?? "");
    if (!title || !familyId)
      return NextResponse.json({ success: false, error: "Title and family are required" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const now = Date.now();
    const ref = await orgRef.collection("jobs").add({
      title,
      code: body.code ?? null,
      familyId,
      careerPath: body.careerPath ?? "IC",
      band: body.band ?? "3IC",
      description: String(body.description ?? ""),
      jobPurpose: String(body.jobPurpose ?? ""),
      jd: String(body.jd ?? ""),
      reportsToJobId: body.reportsToJobId ?? null,
      currentGrade: null,
      currentEvaluationId: null,
      confidence: null,
      flags: [],
      status: "draft",
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    });
    await orgRef.collection("families").doc(familyId).update({ jobCount: FieldValue.increment(1) }).catch(() => {});
    await logActivity(orgRef, actor, { type: "job_created", targetType: "job", targetId: ref.id, summary: `Added job "${title}"` });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
