export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan } from "@/lib/server/org";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit the structure." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.type === "string") update.type = body.type;
    if ("parentId" in body) update.parentId = body.parentId ?? null;
    if (Array.isArray(body.functionalLinks)) update.functionalLinks = body.functionalLinks;
    if (body.headcount !== undefined) update.headcount = Number(body.headcount) || 0;
    if (body.vacancies !== undefined) update.vacancies = Number(body.vacancies) || 0;
    if (body.order !== undefined) update.order = Number(body.order) || 0;
    await orgRef.collection("orgUnits").doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit the structure." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    const col = orgRef.collection("orgUnits");
    const doc = await col.doc(id).get();
    const parentId = doc.data()?.parentId ?? null;

    // Re-parent direct children to the deleted node's parent.
    const children = await col.where("parentId", "==", id).get();
    const batch = orgRef.firestore.batch();
    children.docs.forEach((c) => batch.update(c.ref, { parentId, updatedAt: Date.now() }));
    // Drop any functional links pointing at this node.
    const linkers = await col.where("functionalLinks", "array-contains", id).get();
    linkers.docs.forEach((l) => batch.update(l.ref, { functionalLinks: FieldValue.arrayRemove(id) }));
    batch.delete(col.doc(id));
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
