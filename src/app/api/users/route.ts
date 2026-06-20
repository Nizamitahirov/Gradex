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

/** List all users (no secrets). Requires users:view. */
export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "users", "view")))
    return NextResponse.json({ success: false, error: "You don't have permission to view users." }, { status: 403 });
  try {
    const snap = await getAdminDb().collection("users").orderBy("createdAt", "asc").get();
    const users = snap.docs.map((d) => {
      const u = d.data();
      return {
        id: d.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email ?? null,
        role: u.role ?? null,
        roleId: u.roleId ?? null,
        allCompanies: u.allCompanies === true || u.role === "admin",
        companyAccess: Array.isArray(u.companyAccess) ? u.companyAccess : [],
        isActive: u.isActive ?? true,
        mustChangePassword: u.mustChangePassword === true,
        lastLoginAt: u.lastLoginAt ?? null,
      };
    });
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

/** Create a user with a temporary password (forced change on first login). */
export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "users", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to create users." }, { status: 403 });
  try {
    const body = await req.json();
    const username = String(body.username ?? "").toLowerCase().trim();
    const displayName = String(body.displayName ?? "").trim();
    if (!username || !displayName)
      return NextResponse.json({ success: false, error: "Username and full name are required" }, { status: 400 });

    const db = getAdminDb();
    const existing = await db.collection("users").where("username", "==", username).limit(1).get();
    if (!existing.empty) return NextResponse.json({ success: false, error: "That username is already taken" }, { status: 400 });

    const tempPassword = String(body.password ?? "").trim() || genPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const now = Date.now();
    const ref = await db.collection("users").add({
      username,
      displayName,
      email: String(body.email ?? "").trim() || null,
      passwordHash,
      roleId: body.roleId ?? null,
      role: body.role ?? null,
      allCompanies: body.allCompanies === true,
      companyAccess: Array.isArray(body.companyAccess) ? body.companyAccess : [],
      isActive: true,
      mustChangePassword: true,
      createdBy: actor.userId,
      createdAt: now,
      lastLoginAt: null,
    });
    return NextResponse.json({ success: true, id: ref.id, tempPassword });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
