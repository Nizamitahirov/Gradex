export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor, actorCan } from "@/lib/server/org";

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "users", "edit")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit users." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const db = getAdminDb();
    const update: Record<string, unknown> = {};

    if (typeof body.displayName === "string") update.displayName = body.displayName.trim();
    if (typeof body.email === "string") update.email = body.email.trim() || null;
    if ("roleId" in body) update.roleId = body.roleId ?? null;
    if ("role" in body) update.role = body.role ?? null;
    if (typeof body.allCompanies === "boolean") update.allCompanies = body.allCompanies;
    if (Array.isArray(body.companyAccess)) update.companyAccess = body.companyAccess;
    if (typeof body.isActive === "boolean") update.isActive = body.isActive;

    // Password reset → returns a new temp password and forces a change.
    let tempPassword: string | undefined;
    if (body.resetPassword) {
      tempPassword = String(body.password ?? "").trim() || genPassword();
      update.passwordHash = await bcrypt.hash(tempPassword, 10);
      update.mustChangePassword = true;
    }

    if (Object.keys(update).length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    await db.collection("users").doc(id).update(update);
    return NextResponse.json({ success: true, ...(tempPassword ? { tempPassword } : {}) });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "users", "delete")))
    return NextResponse.json({ success: false, error: "You don't have permission to delete users." }, { status: 403 });
  try {
    const { id } = await ctx.params;
    if (id === actor.userId) return NextResponse.json({ success: false, error: "You can't delete your own account." }, { status: 400 });
    await getAdminDb().collection("users").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
