export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getPrimaryOrgRef } from "@/lib/server/org";

export async function GET(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const orgRef = await getPrimaryOrgRef();
  if (!orgRef) return NextResponse.json({ success: true, structures: [] });
  const snap = await orgRef.collection("payStructures").orderBy("createdAt", "asc").get();
  return NextResponse.json({ success: true, structures: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const orgRef = await getPrimaryOrgRef();
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const col = orgRef.collection("payStructures");
    const existing = await col.get();
    const isBase = body.isBase ?? existing.empty; // first one becomes the base
    if (isBase) {
      const batch = orgRef.firestore.batch();
      existing.docs.forEach((d) => batch.update(d.ref, { isBase: false }));
      await batch.commit();
    }
    const ref = await col.add({
      name: String(body.name ?? "Untitled"),
      isBase,
      params: body.params ?? {},
      rows: body.rows ?? [],
      createdBy: actor.userId,
      createdAt: Date.now(),
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
