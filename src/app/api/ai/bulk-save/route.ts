export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, logActivity } from "@/lib/server/org";
import { FieldValue } from "firebase-admin/firestore";

interface IncomingJob {
  title: string;
  family: string;
  jobPurpose?: string;
  jd?: string;
  band: string;
  careerPath: string;
  finalGrade: number;
  computedGrade?: number;
  factorSelections?: Record<string, number>;
  factorScores?: Record<string, number>;
  rawScore?: number;
  rMax?: number;
  bandWindow?: { lo: number; hi: number };
  confidence?: string;
  anomaly?: boolean;
  flags?: string[];
  breakdown?: unknown[];
}

export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const jobs: IncomingJob[] = body.jobs ?? [];
    if (!jobs.length) return NextResponse.json({ success: false, error: "No jobs" }, { status: 400 });

    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "No organization" }, { status: 404 });

    // Resolve / create families by name (case-insensitive).
    const famSnap = await orgRef.collection("families").get();
    const famByName = new Map<string, string>();
    famSnap.docs.forEach((d) => famByName.set(String(d.data().name).toLowerCase(), d.id));

    const now = Date.now();
    let created = 0;

    for (const j of jobs) {
      const famName = (j.family || "General").trim();
      let familyId = famByName.get(famName.toLowerCase());
      if (!familyId) {
        const ref = await orgRef.collection("families").add({
          name: famName,
          key: famName.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
          description: "",
          color: null,
          jobCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        familyId = ref.id;
        famByName.set(famName.toLowerCase(), familyId);
      }

      const jobRef = await orgRef.collection("jobs").add({
        title: j.title,
        familyId,
        careerPath: j.careerPath,
        band: j.band,
        description: "",
        jobPurpose: j.jobPurpose ?? "",
        jd: j.jd ?? "",
        reportsToJobId: null,
        currentGrade: j.finalGrade,
        currentEvaluationId: null,
        confidence: j.confidence ?? null,
        flags: j.flags ?? [],
        status: j.anomaly ? "needs_review" : "graded",
        source: "ai_bulk",
        createdBy: actor.userId,
        createdAt: now,
        updatedAt: now,
      });

      const evalRef = await jobRef.collection("evaluations").add({
        factorSelections: j.factorSelections ?? {},
        factorScores: j.factorScores ?? {},
        rawScore: j.rawScore ?? 0,
        rMax: j.rMax ?? 0,
        computedGrade: j.computedGrade ?? j.finalGrade,
        finalGrade: j.finalGrade,
        bandWindow: j.bandWindow ?? null,
        anomaly: !!j.anomaly,
        flags: j.flags ?? [],
        confidence: j.confidence ?? null,
        breakdown: j.breakdown ?? [],
        note: "Graded by AI from uploaded JD.",
        gradedBy: actor.userId,
        gradedByName: actor.displayName,
        gradedAt: now,
        source: "ai",
      });

      await jobRef.update({ currentEvaluationId: evalRef.id });
      await orgRef.collection("families").doc(familyId).update({ jobCount: FieldValue.increment(1) }).catch(() => {});
      created++;
    }

    await logActivity(orgRef, actor, {
      type: "bulk_graded",
      summary: `AI bulk-graded ${created} job${created === 1 ? "" : "s"} from uploaded JDs`,
    });

    return NextResponse.json({ success: true, created });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
