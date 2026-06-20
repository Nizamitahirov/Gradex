export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "scoping", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit scoping." }, { status: 403 });

  try {
    const body = await req.json();
    const { inputs, result } = body;
    if (!inputs || !result) return NextResponse.json({ success: false, error: "inputs and result required" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const now = Date.now();
    await orgRef.update({
      updatedAt: now,
      scoping: { inputs, result, completed: true, completedAt: now },
    });
    await logActivity(orgRef, actor, {
      type: "scoping_completed",
      summary: `Updated scoping — Company Grade ${result.companyGrade}`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
