export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint (no secrets leaked). Reports whether the server
 * environment is wired correctly so login/data can work in production.
 */
export async function GET() {
  const out: Record<string, unknown> = {};

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  out.hasServiceAccountB64 = Boolean(b64);
  out.serviceAccountB64Length = b64 ? b64.length : 0;
  out.hasJwtSecret = Boolean(process.env.JWT_SECRET);
  out.nodeEnv = process.env.NODE_ENV;

  // Try to parse the service account (without exposing its contents).
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64.trim(), "base64").toString("utf8"));
      out.serviceAccountParsed = true;
      out.projectId = json.project_id ?? null;
      out.clientEmailDomain =
        typeof json.client_email === "string" ? json.client_email.split("@")[1] : null;
      out.privateKeyLooksValid =
        typeof json.private_key === "string" && json.private_key.includes("BEGIN PRIVATE KEY");
    } catch (e) {
      out.serviceAccountParsed = false;
      out.parseError = e instanceof Error ? e.message : String(e);
    }
  }

  // Try a real Firestore read via the Admin SDK.
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snap = await getAdminDb().collection("users").limit(1).get();
    out.firestoreOk = true;
    out.usersCollectionReachable = true;
    out.userCountSample = snap.size;
  } catch (e) {
    out.firestoreOk = false;
    out.firestoreError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}
