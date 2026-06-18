export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getPrimaryOrgRef, logActivity } from "@/lib/server/org";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { jobId } = await ctx.params;
    const orgRef = await getPrimaryOrgRef();
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const jobRef = orgRef.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    const job = jobSnap.data();

    // Delete evaluations subcollection then the job.
    const evals = await jobRef.collection("evaluations").get();
    const batch = orgRef.firestore.batch();
    evals.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(jobRef);
    await batch.commit();

    if (job?.familyId) {
      await orgRef.collection("families").doc(job.familyId).update({ jobCount: FieldValue.increment(-1) }).catch(() => {});
    }
    await logActivity(orgRef, actor, { type: "job_deleted", targetType: "job", targetId: jobId, summary: `Deleted "${job?.title ?? "a job"}"` });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
