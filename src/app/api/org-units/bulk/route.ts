export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, getActiveOrgRef, actorCan, logActivity } from "@/lib/server/org";

interface IncomingNode {
  tmpId: string;
  name: string;
  nameEn?: string;
  type: string;
  parentTmp: string | null;
  headcount?: number;
  vacancies?: number;
}

/** Bulk-create org units from a parsed structure (optionally replacing the current one). */
export async function POST(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!(await actorCan(req, "families", "create")))
    return NextResponse.json({ success: false, error: "You don't have permission to edit the structure." }, { status: 403 });
  try {
    const body = await req.json();
    const nodes: IncomingNode[] = Array.isArray(body.nodes) ? body.nodes : [];
    if (nodes.length === 0) return NextResponse.json({ success: false, error: "No nodes to import" }, { status: 400 });
    const orgRef = await getActiveOrgRef(req);
    if (!orgRef) return NextResponse.json({ success: false, error: "Select a company first" }, { status: 404 });

    const col = orgRef.collection("orgUnits");
    const db = orgRef.firestore;

    // Optionally clear the existing structure first.
    if (body.replace) {
      const existing = await col.get();
      for (let i = 0; i < existing.docs.length; i += 400) {
        const batch = db.batch();
        existing.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Pre-generate ids so parent references resolve regardless of order.
    const idByTmp = new Map<string, string>();
    nodes.forEach((n) => idByTmp.set(n.tmpId, col.doc().id));

    const now = Date.now();
    let created = 0;
    for (let i = 0; i < nodes.length; i += 400) {
      const batch = db.batch();
      for (const n of nodes.slice(i, i + 400)) {
        const id = idByTmp.get(n.tmpId)!;
        batch.set(col.doc(id), {
          name: String(n.name).slice(0, 160),
          nameEn: n.nameEn ? String(n.nameEn).slice(0, 160) : null,
          type: n.type,
          parentId: n.parentTmp ? idByTmp.get(n.parentTmp) ?? null : null,
          functionalLinks: [],
          headcount: Number(n.headcount) || 0,
          vacancies: Number(n.vacancies) || 0,
          order: now + created,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
      await batch.commit();
    }

    await logActivity(orgRef, actor, { type: "structure_imported", summary: `Imported ${created} structure nodes from Excel` });
    return NextResponse.json({ success: true, created });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
