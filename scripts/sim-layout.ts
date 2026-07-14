/**
 * Simulate the org-chart layout against str.xlsx (no Firestore).
 * Measures canvas aspect ratio, checks that wide sibling sets wrap into a grid,
 * and reports node overlaps. Purely offline — verifies chart-layout.ts.
 *
 * Usage: tsx scripts/sim-layout.ts
 */

import ExcelJS from "exceljs";
import { excelTypeToKey, buildTree, type OrgUnit } from "../src/lib/org/structure";
import { augmentTree, computeLayout, NODE_W, NODE_H, type ANode } from "../src/lib/org/chart-layout";

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
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(new URL("../str.xlsx", import.meta.url).pathname);
  const ws = wb.getWorksheet("OrgChart data");
  if (!ws) throw new Error("Sheet not found");

  const units: OrgUnit[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const r = ws.getRow(i);
    const id = cell(r.getCell(1).value);
    if (!id) continue;
    units.push({
      id,
      parentId: cell(r.getCell(2).value) || null,
      name: cell(r.getCell(3).value),
      nameEn: cell(r.getCell(4).value),
      type: excelTypeToKey(cell(r.getCell(8).value)),
      order: i,
    });
  }
  console.log(`Units: ${units.length}`);

  const roots = buildTree(units);
  const augGroup = augmentTree(roots, true);
  const augFlat = augmentTree(roots, false);

  const openAll = () => true;

  for (const [label, aug] of [["grouped", augGroup], ["ungrouped", augFlat]] as const) {
    for (const orient of ["horizontal", "vertical"] as const) {
      const layout = computeLayout(aug as ANode[], orient, openAll);
      const { width, height, placed } = layout;
      const ratio = (width / height).toFixed(2);

      // overlap check
      let overlaps = 0;
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i], b = placed[j];
          if (a.x < b.x + NODE_W && a.x + NODE_W > b.x && a.y < b.y + NODE_H && a.y + NODE_H > b.y) overlaps++;
        }
      }
      console.log(
        `[${label}/${orient}] nodes=${placed.length} canvas=${Math.round(width)}x${Math.round(height)} ratio=${ratio} overlaps=${overlaps}`,
      );
    }
  }

  // Inspect the widest sibling set (Deputy Chairman) in grouped/horizontal.
  const findWide = (n: ANode, path: string): void => {
    if (n.children.length > 5) {
      console.log(`  wide parent "${n.name}" (${path}) has ${n.children.length} children`);
    }
    n.children.forEach((c) => findWide(c, `${path}>${c.name.slice(0, 10)}`));
  };
  console.log("Wide sibling sets (grouped tree):");
  (augGroup as ANode[]).forEach((r) => findWide(r, r.name.slice(0, 10)));

  // For the widest set, verify its children are gridded (span multiple depth rows).
  const layout = computeLayout(augGroup as ANode[], "horizontal", openAll);
  const byId = new Map(layout.placed.map((p) => [p.node.id, p]));
  const widest = (() => {
    let best: ANode | null = null;
    const walk = (n: ANode) => { if (!best || n.children.length > best.children.length) best = n; n.children.forEach(walk); };
    (augGroup as ANode[]).forEach(walk);
    return best as ANode | null;
  })();
  if (widest) {
    const w = widest as ANode;
    const xs = new Set(w.children.map((c) => Math.round(byId.get(c.id)!.x)));
    const ys = new Set(w.children.map((c) => Math.round(byId.get(c.id)!.y)));
    console.log(`Widest parent "${w.name}" ${w.children.length} children → distinct depth-cols(x)=${xs.size} sibling-rows(y)=${ys.size}`);
    console.log(`  (a single unwrapped row would be x-cols=1, y-rows=${w.children.length}; a grid uses multiple x-cols)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
