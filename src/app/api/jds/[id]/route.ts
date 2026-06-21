export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";
import { addJdVersion } from "@/lib/server/jd";

/** Get a JD with its full version history. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jd", "view")))
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    const jdRef = orgRef.collection("jds").doc(id);
    const [doc, versionsSnap] = await Promise.all([
      jdRef.get(),
      jdRef.collection("versions").orderBy("version", "desc").get(),
    ]);
    if (!doc.exists) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      jd: { id: doc.id, ...doc.data() },
      versions: versionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Edit a JD → appends a new version. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jd", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit job descriptions." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    const jdRef = orgRef.collection("jds").doc(id);

    // Azerbaijani version update (separate field, no EN version bump).
    if (typeof body.contentAz === "string") {
      await jdRef.update({ contentAz: body.contentAz, contentAzUpdatedAt: Date.now(), updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    // Title-only update (no new version).
    if (typeof body.title === "string" && body.content === undefined) {
      await jdRef.update({ title: body.title.trim(), updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    const content = String(body.content ?? "").trim();
    if (!content) return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    const source = body.source === "ai" || body.source === "upload" ? body.source : "manual";
    const version = await addJdVersion(jdRef, actor, content, String(body.note ?? "Edited"), source);
    const extra: Record<string, unknown> = {};
    if (typeof body.title === "string") extra.title = body.title.trim();
    if (source === "ai") extra.aiRewritten = true;
    if (Object.keys(extra).length) await jdRef.update(extra);
    await logActivity(orgRef, actor, { type: "jd_updated", targetType: "jd", targetId: id, summary: `Updated job description (v${version})` });
    return NextResponse.json({ success: true, version });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "jd", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to delete job descriptions." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    const jdRef = orgRef.collection("jds").doc(id);
    const versions = await jdRef.collection("versions").get();
    const batch = orgRef.firestore.batch();
    versions.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(jdRef);
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
