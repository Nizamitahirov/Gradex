export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor, actorCan } from "@/lib/server/org";
import { DEFAULT_ROLES } from "@/lib/auth/permissions";

/** Seed the built-in roles once, if the collection is empty. */
async function ensureDefaultRoles(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("roles").limit(1).get();
  if (!snap.empty) return;
  const now = Date.now();
  const batch = db.batch();
  for (const r of DEFAULT_ROLES) {
    const ref = db.collection("roles").doc();
    batch.set(ref, { ...r, createdAt: now, updatedAt: now });
  }
  await batch.commit();
}

export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminDb();
    await ensureDefaultRoles(db);
    const snap = await db.collection("roles").orderBy("createdAt", "asc").get();
    const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, roles });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "roles", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to manage roles." }, { status: 403 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ success: false, error: "Role name is required" }, { status: 400 });
    const db = getAdminDb();
    const now = Date.now();
    const ref = await db.collection("roles").add({
      name,
      description: String(body.description ?? ""),
      permissions: body.permissions ?? {},
      isAdmin: body.isAdmin === true,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
