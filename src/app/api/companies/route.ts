export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor, getUserAccess, accessibleOrgIds } from "@/lib/server/org";

/** List the companies the current user can access. */
export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminDb();
    const ids = await accessibleOrgIds(actor.userId);
    const docs = await Promise.all(ids.map((id) => db.collection("orgs").doc(id).get()));
    const companies = docs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, name: (d.data()?.name as string) ?? "Company", industry: d.data()?.industry ?? "", currency: d.data()?.currency ?? "USD" }));
    return NextResponse.json({ success: true, companies });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Create a new, empty company. Only admins / full-access users may create. */
export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const access = await getUserAccess(actor.userId);
    if (!access.allCompanies) {
      return NextResponse.json({ success: false, error: "Only administrators can create companies." }, { status: 403 });
    }
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 });

    const db = getAdminDb();
    const now = Date.now();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
    const ref = await db.collection("orgs").add({
      name,
      slug,
      logoURL: null,
      industry: String(body.industry ?? ""),
      currency: String(body.currency ?? "USD"),
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
      scoping: null,
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
