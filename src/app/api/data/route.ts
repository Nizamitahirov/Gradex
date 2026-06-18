export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

/** Convert Firestore Timestamps (and nested) to plain millis for JSON. */
function toMillis(v: unknown): unknown {
  if (v && typeof v === "object") {
    const maybe = v as { toMillis?: () => number };
    if (typeof maybe.toMillis === "function") return maybe.toMillis();
    if (Array.isArray(v)) return v.map(toMillis);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = toMillis(val);
    return out;
  }
  return v;
}

function docData(d: FirebaseFirestore.QueryDocumentSnapshot) {
  return { id: d.id, ...(toMillis(d.data()) as Record<string, unknown>) };
}

/**
 * Returns the organization's real data from Firestore (Admin SDK):
 * org, families, jobs, evaluations and recent activity. Requires a valid
 * session cookie.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const orgsSnap = await db.collection("orgs").limit(1).get();
    if (orgsSnap.empty) {
      return NextResponse.json({ success: true, data: null });
    }
    const orgDoc = orgsSnap.docs[0];
    const orgRef = orgDoc.ref;

    const [familiesSnap, jobsSnap, activitySnap] = await Promise.all([
      orgRef.collection("families").get(),
      orgRef.collection("jobs").get(),
      orgRef.collection("activity").orderBy("createdAt", "desc").limit(50).get(),
    ]);

    // Evaluations across all jobs (one org → collectionGroup is fine).
    const evalSnap = await db.collectionGroup("evaluations").get();
    const evaluations = evalSnap.docs.map((d) => ({
      ...(docData(d) as Record<string, unknown>),
      jobId: d.ref.parent.parent?.id ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        org: { id: orgDoc.id, ...(toMillis(orgDoc.data()) as Record<string, unknown>) },
        families: familiesSnap.docs.map(docData),
        jobs: jobsSnap.docs.map(docData),
        evaluations,
        activity: activitySnap.docs.map(docData),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
