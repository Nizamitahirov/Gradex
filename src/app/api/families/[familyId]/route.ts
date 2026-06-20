export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ familyId: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to delete families." }, { status: 403 });

  try {
    const { familyId } = await ctx.params;
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    // Delete the family and its jobs.
    const jobsSnap = await orgRef.collection("jobs").where("familyId", "==", familyId).get();
    const batch = orgRef.firestore.batch();
    jobsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(orgRef.collection("families").doc(familyId));
    await batch.commit();
    await logActivity(orgRef, actor, { type: "family_deleted", targetType: "family", targetId: familyId, summary: "Deleted a family" });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
