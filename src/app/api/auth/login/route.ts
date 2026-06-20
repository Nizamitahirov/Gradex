export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, COOKIE_OPTIONS, signToken } from "@/lib/auth";
import { COMPANY_COOKIE, accessibleOrgIds } from "@/lib/server/org";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const snap = await db
      .collection("users")
      .where("username", "==", String(username).toLowerCase().trim())
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const doc = snap.docs[0];
    const data = doc.data();
    const ok = data.passwordHash && (await bcrypt.compare(password, data.passwordHash));
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const token = signToken({
      userId: doc.id,
      username: data.username,
      role: data.role,
      displayName: data.displayName,
    });

    await doc.ref.update({ lastLoginAt: Date.now() });

    const ids = await accessibleOrgIds(doc.id);

    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: doc.id,
          username: data.username,
          displayName: data.displayName,
          role: data.role,
          email: data.email ?? null,
          mustChangePassword: data.mustChangePassword === true,
        },
      },
    });
    res.cookies.set(AUTH_COOKIE, token, COOKIE_OPTIONS);
    // Default the active company to the user's first accessible one.
    if (ids.length > 0) {
      res.cookies.set(COMPANY_COOKIE, ids[0], { ...COOKIE_OPTIONS, httpOnly: false });
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
