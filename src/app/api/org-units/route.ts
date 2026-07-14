export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";

/** List org-structure units for the active company + the structure mode. */
export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "view")))
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  try {
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: true, units: [], structureMode: "functional" });
    const [snap, orgSnap] = await Promise.all([orgRef.collection("orgUnits").get(), orgRef.get()]);
    return NextResponse.json({
      success: true,
      units: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      structureMode: (orgSnap.data()?.structureMode as string) ?? "functional",
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Create a unit. */
export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit the structure." }, { status: 403 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "Select a company first" }, { status: 404 });
    const now = Date.now();
    const ref = await orgRef.collection("orgUnits").add({
      name,
      nameEn: body.nameEn ? String(body.nameEn).trim() : null,
      type: String(body.type ?? "unit"),
      parentId: body.parentId ?? null,
      functionalLinks: Array.isArray(body.functionalLinks) ? body.functionalLinks : [],
      headcount: Number(body.headcount) || 0,
      vacancies: Number(body.vacancies) || 0,
      order: Number(body.order) || now,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(orgRef, actor, { type: "unit_created", targetType: "orgUnit", targetId: ref.id, summary: `Added "${name}" to the structure` });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Set the structure mode (functional / agile) for the active company. */
export async function PATCH(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit the structure." }, { status: 403 });
  try {
    const body = await req.json();
    const mode = body.structureMode === "agile" ? "agile" : "functional";
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No company" }, { status: 404 });
    await orgRef.update({ structureMode: mode, updatedAt: Date.now() });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
