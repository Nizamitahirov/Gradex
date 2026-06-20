export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getActor, accessibleOrgIds, activeCompanyCookie } from "@/lib/server/org";

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
 * Returns data for the active company (or aggregated across all the user's
 * companies when scope = "all"): org, families, jobs, evaluations, activity.
 * Also returns the list of companies the user can switch between.
 */
export async function GET(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const ids = await accessibleOrgIds(actor.userId);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: null, companies: [], scope: null });
    }

    // Company list for the switcher.
    const orgDocs = await Promise.all(ids.map((id) => db.collection("orgs").doc(id).get()));
    const companies = orgDocs
      .filter((d) => d.exists)
      .map((d) => ({ id: d.id, name: (d.data()?.name as string) ?? "Company" }));

    const cookie = activeCompanyCookie(req);
    const scope = cookie === "all" ? "all" : cookie && ids.includes(cookie) ? cookie : ids[0];
    const targetIds = scope === "all" ? companies.map((c) => c.id) : [scope];

    // Load each target org's collections.
    const perOrg = await Promise.all(
      targetIds.map(async (orgId) => {
        const orgRef = db.collection("orgs").doc(orgId);
        const [orgSnap, familiesSnap, jobsSnap, activitySnap] = await Promise.all([
          orgRef.get(),
          orgRef.collection("families").get(),
          orgRef.collection("jobs").get(),
          orgRef.collection("activity").orderBy("createdAt", "desc").limit(50).get(),
        ]);
        const orgName = (orgSnap.data()?.name as string) ?? "Company";
        const tag = (o: Record<string, unknown>) => ({ ...o, orgId, orgName });
        return {
          orgSnap,
          orgId,
          orgName,
          families: familiesSnap.docs.map((d) => tag(docData(d))),
          jobs: jobsSnap.docs.map((d) => tag(docData(d))),
          activity: activitySnap.docs.map((d) => tag(docData(d))),
        };
      }),
    );

    // Evaluations via collectionGroup, filtered to the target orgs.
    const evalSnap = await db.collectionGroup("evaluations").get();
    const targetSet = new Set(targetIds);
    const evaluations = evalSnap.docs
      .map((d) => {
        const orgId = d.ref.parent.parent?.parent.parent?.id ?? null;
        return { orgId, jobId: d.ref.parent.parent?.id ?? null, doc: d };
      })
      .filter((e) => e.orgId && targetSet.has(e.orgId))
      .map((e) => ({ ...(docData(e.doc) as Record<string, unknown>), jobId: e.jobId, orgId: e.orgId }));

    const families = perOrg.flatMap((o) => o.families);
    const jobs = perOrg.flatMap((o) => o.jobs);
    const activity = (perOrg.flatMap((o) => o.activity) as Record<string, unknown>[])
      .sort((a, b) => ((b.createdAt as number) ?? 0) - ((a.createdAt as number) ?? 0))
      .slice(0, 50);

    let org: Record<string, unknown>;
    if (scope === "all") {
      const first = perOrg[0]?.orgSnap.data() ?? {};
      org = {
        id: "all",
        name: "All companies",
        scopeAll: true,
        companyCount: companies.length,
        currency: (first.currency as string) ?? "USD",
        industry: "",
        scoping: null,
      };
    } else {
      const target = perOrg[0];
      org = { id: target.orgId, ...(toMillis(target.orgSnap.data() ?? {}) as Record<string, unknown>) };
    }

    return NextResponse.json({
      success: true,
      scope,
      companies,
      data: { org, families, jobs, evaluations, activity },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
