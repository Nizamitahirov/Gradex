export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor, actorCan } from "@/lib/server/org";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "roles", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit roles." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const db = getAdminDb();
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.description === "string") update.description = body.description;
    if (body.permissions) update.permissions = body.permissions;
    if (typeof body.isAdmin === "boolean") update.isAdmin = body.isAdmin;
    await db.collection("roles").doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "roles", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to delete roles." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const db = getAdminDb();
    const roleDoc = await db.collection("roles").doc(id).get();
    if (roleDoc.data()?.isSystem) {
      return NextResponse.json({ success: false, error: "Built-in roles can't be deleted." }, { status: 400 });
    }
    const inUse = await db.collection("users").where("roleId", "==", id).limit(1).get();
    if (!inUse.empty) {
      return NextResponse.json({ success: false, error: "This role is assigned to users — reassign them first." }, { status: 400 });
    }
    await db.collection("roles").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
