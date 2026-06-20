export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor } from "@/lib/server/org";

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || String(newPassword).length < 8) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters." }, { status: 400 });
    }
    const db = getAdminDb();
    const ref = db.collection("users").doc(actor.userId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    const data = doc.data()!;

    // Verify the current password unless this is a forced first-login change.
    if (!data.mustChangePassword) {
      const ok = data.passwordHash && (await bcrypt.compare(String(currentPassword ?? ""), data.passwordHash));
      if (!ok) return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 400 });
    }

    await ref.update({
      passwordHash: await bcrypt.hash(String(newPassword), 10),
      mustChangePassword: false,
      passwordChangedAt: Date.now(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
