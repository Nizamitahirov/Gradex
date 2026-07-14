/**
 * Seed the Organization structure from str.xlsx into Firestore.
 * Reads the "OrgChart data" sheet (parent-child edge list, AZ/EN names, types,
 * levels), maps types to Gradex keys, and writes them as orgUnits under the
 * primary company. The Excel IDs (U001…) become the Firestore doc ids so the
 * Parent ID references resolve directly.
 *
 * Usage:  tsx scripts/seed-org-structure.ts
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import ExcelJS from "exceljs";
import { excelTypeToKey } from "../src/lib/org/structure";

// --- load .env.local (FIREBASE_SERVICE_ACCOUNT_BASE64 etc.) ---
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch { /* ignore */ }
}

function resolveServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return { projectId: json.project_id, clientEmail: json.client_email, privateKey: String(json.private_key).replace(/\\n/g, "\n") };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
}

const cell = (v: ExcelJS.CellValue): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in v) return String((v as { text: string }).text).trim();
    if ("result" in v) return String((v as { result: unknown }).result).trim();
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("").trim();
  }
  return String(v).trim();
};

async function main() {
  loadEnv();
  const sa = resolveServiceAccount();
  if (!sa) { console.error("Missing Firebase credentials (.env.local)."); process.exit(1); }
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  // Parse the Excel.
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(new URL("../str.xlsx", import.meta.url).pathname);
  const ws = wb.getWorksheet("OrgChart data");
  if (!ws) throw new Error("Sheet 'OrgChart data' not found");

  interface Row { id: string; parentId: string | null; name: string; nameEn: string; type: string; level: number; order: number }
  const rows: Row[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const id = cell(r.getCell(1).value);
    if (!id) continue;
    const parent = cell(r.getCell(2).value);
    rows.push({
      id,
      parentId: parent || null,
      name: cell(r.getCell(3).value),
      nameEn: cell(r.getCell(4).value),
      type: excelTypeToKey(cell(r.getCell(8).value)),
      level: Number(cell(r.getCell(9).value)) || 0,
      order: i,
    });
  }
  console.log(`Parsed ${rows.length} units from str.xlsx`);

  // Target = primary org (first in the collection), matching getPrimaryOrgRef.
  const orgsSnap = await db.collection("orgs").limit(1).get();
  if (orgsSnap.empty) { console.error("No org found in Firestore."); process.exit(1); }
  const orgRef = orgsSnap.docs[0].ref;
  console.log(`Target company: "${orgsSnap.docs[0].data().name}" (${orgRef.id})`);

  const col = orgRef.collection("orgUnits");

  // Clear existing structure.
  const existing = await col.get();
  console.log(`Clearing ${existing.size} existing units…`);
  for (let i = 0; i < existing.docs.length; i += 400) {
    const batch = db.batch();
    existing.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Write new structure (doc id = Excel ID).
  const now = Date.now();
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    for (const r of rows.slice(i, i + 400)) {
      batch.set(col.doc(r.id), {
        name: r.name,
        nameEn: r.nameEn || null,
        type: r.type,
        parentId: r.parentId,
        functionalLinks: [],
        headcount: 0,
        vacancies: 0,
        level: r.level,
        order: r.order,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  console.log(`Done: seeded ${rows.length} org units into ${orgRef.id}.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
