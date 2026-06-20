export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/server/org";
import { compareStructures, payInsights } from "@/lib/server/ai";

export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    let analysis: string;
    if (body.mode === "insights") {
      analysis = await payInsights(String(body.summary ?? ""));
    } else {
      analysis = await compareStructures(body.a, body.b);
    }
    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "AI error" }, { status: 500 });
  }
}
