export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getPrimaryOrgRef } from "@/lib/server/org";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const orgRef = await getPrimaryOrgRef();
  if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });
  await orgRef.collection("payStructures").doc(id).delete();
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const orgRef = await getPrimaryOrgRef();
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
