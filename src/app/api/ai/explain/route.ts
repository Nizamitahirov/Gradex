export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/server/org";
import { explainData } from "@/lib/server/ai";

/** Explain a chart or table in plain language (English or Azerbaijani). */
export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const explanation = await explainData({
      title: String(body.title ?? "Data"),
      kind: body.kind === "table" ? "table" : "chart",
      data: body.data ?? {},
      language: body.language === "az" ? "az" : "en",
    });
    return NextResponse.json({ success: true, explanation });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "AI error" }, { status: 500 });
  }
}
