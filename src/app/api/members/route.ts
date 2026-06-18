export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

/** Returns login users (no secrets). Session-protected. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const snap = await getAdminDb().collection("users").get();
    const members = snap.docs.map((d) => {
      const u = d.data();
      return {
        id: d.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        email: u.email ?? null,
        isActive: u.isActive ?? true,
      };
    });
    return NextResponse.json({ success: true, members });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
