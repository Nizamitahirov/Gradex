export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, logActivity } from "@/lib/server/org";

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    const now = Date.now();
    const ref = await orgRef.collection("families").add({
      name,
      key: name.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
      description: String(body.description ?? ""),
      color: body.color ?? null,
      jobCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(orgRef, actor, {
      type: "family_created",
      targetType: "family",
      targetId: ref.id,
      summary: `Created family "${name}"`,
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
