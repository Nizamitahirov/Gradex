export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";
import { createJdRecord } from "@/lib/server/jd";

/** List job descriptions for the active company. */
export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jd", "view")))
    return NextResponse.json({ success: false, error: "You don't have permission to view job descriptions." }, { status: 403 });
  try {
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: true, jds: [] });
    const snap = await orgRef.collection("jds").orderBy("updatedAt", "desc").get();
    const jds = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, jds });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Create a new job description (v1). */
export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jd", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to create job descriptions." }, { status: 403 });
  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!title || !content) return NextResponse.json({ success: false, error: "Title and content are required" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "Select a company first" }, { status: 404 });

    const id = await createJdRecord(orgRef, actor, {
      title,
      jobTitle: String(body.jobTitle ?? title),
      content,
      source: body.source === "ai" || body.source === "upload" ? body.source : "manual",
      jobId: body.jobId ?? null,
    });
    await logActivity(orgRef, actor, { type: "jd_created", targetType: "jd", targetId: id, summary: `Created job description "${title}"` });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
