export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { getUserContext } from "@/lib/server/org";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const doc = await getAdminDb().collection("users").doc(payload.userId).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const data = doc.data()!;
    if (!data.isActive) {
      return NextResponse.json({ success: false, error: "Account is disabled" }, { status: 403 });
    }

    const accessCtx = await getUserContext(doc.id);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: doc.id,
          username: data.username,
          displayName: data.displayName,
          role: data.role,
          email: data.email ?? null,
          mustChangePassword: data.mustChangePassword === true,
          isAdmin: accessCtx?.isAdmin ?? false,
          allCompanies: accessCtx?.allCompanies ?? false,
          roleName: accessCtx?.roleName ?? data.role ?? "viewer",
          permissions: accessCtx?.permissions ?? {},
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
