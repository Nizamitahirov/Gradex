export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan } from "@/lib/server/org";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "analytics", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to delete pay structures." }, { status: 403 });
  const { id } = await ctx.params;
  const orgRef = await getActiveOrgRef(req);
  if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });
  await orgRef.collection("payStructures").doc(id).delete();
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "analytics", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit pay structures." }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json();
  const orgRef = await getActiveOrgRef(req);
  if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });
  const col = orgRef.collection("payStructures");
  if (body.makeBase) {
    const all = await col.get();
    const batch = orgRef.firestore.batch();
    all.docs.forEach((d) => batch.update(d.ref, { isBase: d.id === id }));
    await batch.commit();
  }
  if (typeof body.name === "string") await col.doc(id).update({ name: body.name });
  return NextResponse.json({ success: true });
}
