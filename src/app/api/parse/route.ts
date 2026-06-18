export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/server/org";
import { parseDocument } from "@/lib/server/parse";

/** Parse an uploaded document (multipart form-data, field "file") to text/html. */
export async function POST(req: NextRequest) {
  if (!getActor(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buf, file.name, file.type);
    return NextResponse.json({ success: true, ...parsed, filename: file.name });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Parse failed" }, { status: 500 });
  }
}
