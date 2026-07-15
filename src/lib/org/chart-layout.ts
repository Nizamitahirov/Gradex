/**
 * Org-chart layout engine — pure, orientation-aware tidy tree.
 * Used by the interactive chart and by the SVG/HTML export so both stay in sync.
 */

import { typeDef, unitColor, readableText, type OrgNode, type OrgUnit } from "./structure";

export type Orientation = "horizontal" | "vertical";

export const NODE_W = 212;
export const NODE_H = 54;
export const GROUP_THRESHOLD = 5; // group same-type siblings when there are more than this

/** A layout node — a real unit or a synthetic "group" that folds many same-type siblings. */
export interface ANode {
  id: string;
  name: string;
  nameEn?: string;
  type: string;
  color: string;
  isGroup: boolean;
  headcount?: number;
  vacancies?: number;
  functionalLinks?: string[];
  unit?: OrgUnit;
  children: ANode[];
}

/** Build the augmented tree; when `group`, fold >GROUP_THRESHOLD same-type siblings into a group node. */
export function augmentTree(roots: OrgNode[], group: boolean): ANode[] {
  const conv = (n: OrgNode): ANode => {
    let children: ANode[];
    if (!group) {
      children = n.children.map(conv);
    } else {
      const byType = new Map<string, OrgNode[]>();
      const order: string[] = [];
      for (const c of n.children) {
        if (!byType.has(c.type)) { byType.set(c.type, []); order.push(c.type); }
        byType.get(c.type)!.push(c);
      }
      children = [];
      for (const t of order) {
        const members = byType.get(t)!;
        if (members.length > GROUP_THRESHOLD) {
          const td = typeDef(t);
          children.push({
            id: `grp:${n.id}:${t}`,
            isGroup: true,
            type: t,
            color: typeDef(t).color,
            name: `${td.labelAz ?? td.label} ×${members.length}`,
            nameEn: `${td.label} ×${members.length}`,
            children: members.map(conv),
          });
        } else {
          members.forEach((c) => children.push(conv(c)));
        }
      }
    }
    return {
      id: n.id, name: n.name, nameEn: n.nameEn, type: n.type, color: unitColor(n.type, n.name, n.nameEn),
      isGroup: false, headcount: n.headcount, vacancies: n.vacancies, functionalLinks: n.functionalLinks,
      unit: n as OrgUnit, children,
    };
  };
  return roots.map(conv);
}

export function countA(n: ANode): number {
  return n.children.reduce((s, c) => s + 1 + countA(c), 0);
}

/** Map id → parent id across the augmented tree (for search ancestor-expansion). */
export function parentMap(roots: ANode[]): Map<string, string | null> {
  const m = new Map<string, string | null>();
  const walk = (n: ANode, p: string | null) => { m.set(n.id, p); n.children.forEach((c) => walk(c, n.id)); };
  roots.forEach((r) => walk(r, null));
  return m;
}

export interface Placed { node: ANode; x: number; y: number; hasKids: boolean; open: boolean; hidden: number }
export interface Edge { id: string; from?: string; to?: string; x1: number; y1: number; x2: number; y2: number; dashed?: boolean; dir?: "right" | "down" }
export interface Layout { placed: Placed[]; edges: Edge[]; width: number; height: number }

/** Wrap a sibling set into a grid when there are more than this many. */
export const GRID_WRAP = 5;

/**
 * Recursive bounding-box packing. Each subtree is laid out and reduced to a box;
 * a node's children go in a single row when few, or a grid when many (sized to
 * each child's own subtree). Column count is orientation-aware so the chart runs
 * WITH the long axis — this keeps it near-square (no sideways sprawl) and fills
 * the screen in both orientations. Connectors render as orthogonal elbows and
 * boxes are filled by role, matching the client's reference org chart.
 */
export function computeLayout(roots: ANode[], orientation: Orientation, isOpen: (n: ANode) => boolean): Layout {
  const horiz = orientation === "horizontal";
  const ND = horiz ? NODE_W : NODE_H;   // node size along depth
  const NC = horiz ? NODE_H : NODE_W;   // node size across siblings
  const DGAP = horiz ? 70 : 48;          // gap between levels / grid rows
  const SGAP = horiz ? 16 : 28;          // gap between siblings / grid cols

  interface Item { node: ANode; cross: number; depth: number }
  interface Sub { items: Item[]; crossW: number; depthH: number; anchor: number }

  const layoutSub = (n: ANode): Sub => {
    const kids = isOpen(n) ? n.children : [];
    if (kids.length === 0) return { items: [{ node: n, cross: 0, depth: 0 }], crossW: NC, depthH: ND, anchor: NC / 2 };

    const subs = kids.map(layoutSub);
    const childDepth = ND + DGAP;
    const items: Item[] = [];
    let nodeCross: number, contentCrossW: number, contentDepthH: number;

    if (kids.length <= GRID_WRAP) {
      // single row
      let off = 0, maxH = 0;
      const anchors: number[] = [];
      for (const s of subs) {
        for (const it of s.items) items.push({ node: it.node, cross: it.cross + off, depth: it.depth });
        anchors.push(off + s.anchor);
        off += s.crossW + SGAP;
        maxH = Math.max(maxH, s.depthH);
      }
      contentCrossW = off - SGAP;
      contentDepthH = maxH;
      nodeCross = (anchors[0] + anchors[anchors.length - 1]) / 2 - NC / 2;
    } else {
      // masonry: pack children into a few cross-lanes, each lane tightly stacked
      // along depth. Every child drops into the currently-SHORTEST lane, so no
      // lane is left with a big empty tail — gaps get filled instead of leaving a
      // ragged grid. Lane count is orientation-aware so the block runs with the
      // long axis and the whole chart stays near-square.
      const n = kids.length;
      const lanes = horiz
        ? Math.ceil(Math.sqrt(n))              // slightly landscape
        : Math.max(1, Math.round(Math.sqrt(n) * 0.7)); // portrait
      const laneDepth = new Array(lanes).fill(0);  // running depth used per lane
      const laneCrossW = new Array(lanes).fill(0); // widest child in the lane
      const laneOf = new Array(subs.length), depthAt = new Array(subs.length);
      subs.forEach((s, i) => {
        let b = 0;
        for (let k = 1; k < lanes; k++) if (laneDepth[k] < laneDepth[b] - 0.001) b = k;
        laneOf[i] = b; depthAt[i] = laneDepth[b];
        laneDepth[b] += s.depthH + DGAP;
        laneCrossW[b] = Math.max(laneCrossW[b], s.crossW);
      });
      const laneCrossX: number[] = []; { let x = 0; for (let b = 0; b < lanes; b++) { laneCrossX[b] = x; x += laneCrossW[b] + SGAP; } }
      subs.forEach((s, i) => {
        const b = laneOf[i];
        const cx = laneCrossX[b] + (laneCrossW[b] - s.crossW) / 2;
        for (const it of s.items) items.push({ node: it.node, cross: it.cross + cx, depth: it.depth + depthAt[i] });
      });
      contentCrossW = laneCrossX[lanes - 1] + laneCrossW[lanes - 1];
      contentDepthH = Math.max(...laneDepth) - DGAP;
      nodeCross = (contentCrossW - NC) / 2;
    }

    for (const it of items) it.depth += childDepth;
    const shift = -Math.min(0, nodeCross);
    for (const it of items) it.cross += shift;
    const nodeC = nodeCross + shift;
    items.push({ node: n, cross: nodeC, depth: 0 });
    return { items, crossW: Math.max(nodeC + NC, contentCrossW + shift), depthH: childDepth + contentDepthH, anchor: nodeC + NC / 2 };
  };

  // stack roots along the cross axis
  const all: Item[] = [];
  let off = 0;
  for (const r of roots) {
    const s = layoutSub(r);
    for (const it of s.items) all.push({ node: it.node, cross: it.cross + off, depth: it.depth });
    off += s.crossW + SGAP * 2;
  }

  const pos = new Map<string, { x: number; y: number }>();
  const placed: Placed[] = [];
  for (const it of all) {
    const x = horiz ? it.depth : it.cross;
    const y = horiz ? it.cross : it.depth;
    pos.set(it.node.id, { x, y });
    placed.push({ node: it.node, x, y, hasKids: it.node.children.length > 0, open: isOpen(it.node), hidden: countA(it.node) });
  }

  const edges: Edge[] = [];
  for (const p of placed) {
    if (!isOpen(p.node)) continue;
    for (const k of p.node.children) {
      const a = pos.get(p.node.id)!, b = pos.get(k.id);
      if (!b) continue;
      edges.push(horiz
        ? { id: `${p.node.id}-${k.id}`, from: p.node.id, to: k.id, x1: a.x + NODE_W, y1: a.y + NODE_H / 2, x2: b.x, y2: b.y + NODE_H / 2 }
        : { id: `${p.node.id}-${k.id}`, from: p.node.id, to: k.id, x1: a.x + NODE_W / 2, y1: a.y + NODE_H, x2: b.x + NODE_W / 2, y2: b.y });
    }
  }
  for (const p of placed) {
    for (const t of p.node.functionalLinks ?? []) {
      const b = pos.get(t);
      if (b) edges.push({ id: `f-${p.node.id}-${t}`, from: p.node.id, to: t, x1: p.x + NODE_W / 2, y1: p.y + NODE_H, x2: b.x + NODE_W / 2, y2: b.y, dashed: true });
    }
  }

  const width = Math.max(1, ...placed.map((p) => p.x + NODE_W)) + 20;
  const height = Math.max(1, ...placed.map((p) => p.y + NODE_H)) + 20;
  return { placed, edges, width, height };
}

/**
 * Orthogonal "elbow" connector with small rounded corners — the classic
 * org-chart comb look from the client's reference chart. Horizontal charts turn
 * at the midpoint X, vertical charts at the midpoint Y.
 */
export function edgePath(e: Edge, orientation: Orientation): string {
  const R = 7;
  const dir = e.dir ?? (orientation === "horizontal" ? "right" : "down");
  if (dir === "right") {
    const mx = (e.x1 + e.x2) / 2;
    if (Math.abs(e.y2 - e.y1) < 1) return `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
    const s = e.y2 > e.y1 ? 1 : -1;
    const r = Math.min(R, Math.abs(e.y2 - e.y1) / 2, Math.abs(mx - e.x1));
    return `M ${e.x1} ${e.y1} H ${mx - r} Q ${mx} ${e.y1} ${mx} ${e.y1 + s * r} V ${e.y2 - s * r} Q ${mx} ${e.y2} ${mx + r} ${e.y2} H ${e.x2}`;
  }
  const my = (e.y1 + e.y2) / 2;
  if (Math.abs(e.x2 - e.x1) < 1) return `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
  const s = e.x2 > e.x1 ? 1 : -1;
  const r = Math.min(R, Math.abs(e.x2 - e.x1) / 2, Math.abs(my - e.y1));
  return `M ${e.x1} ${e.y1} V ${my - r} Q ${e.x1} ${my} ${e.x1 + s * r} ${my} H ${e.x2 - s * r} Q ${e.x2} ${my} ${e.x2} ${my + r} V ${e.y2}`;
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Serialize a layout to a standalone SVG string (light theme, for export). */
export function buildSvg(layout: Layout, orientation: Orientation): string {
  const { placed, edges, width, height } = layout;
  const paths = edges.map((e) =>
    `<path d="${edgePath(e, orientation)}" fill="none" stroke="${e.dashed ? "#C0561E" : "#b7bcc7"}" stroke-width="1.4"${e.dashed ? ' stroke-dasharray="5 4" opacity="0.7"' : ""}/>`,
  ).join("");
  const nodes = placed.map(({ node, x, y }) => {
    const c = node.color;
    const fg = readableText(c);
    const sub = fg === "#ffffff" ? "rgba(255,255,255,0.82)" : "rgba(26,28,46,0.66)";
    const az = esc(node.name);
    const en = esc(node.nameEn ?? "");
    const typeLabel = esc(node.isGroup ? "Group" : typeDef(node.type).label);
    return `<g transform="translate(${x},${y})">
      <rect width="${NODE_W}" height="${NODE_H}" rx="7" fill="${c}" stroke="rgba(0,0,0,0.14)" stroke-width="1"${node.isGroup ? ' stroke-dasharray="4 3"' : ""}/>
      <text x="12" y="19" font-family="Segoe UI, system-ui, sans-serif" font-size="12" font-weight="700" fill="${fg}">${az.slice(0, 36)}</text>
      <text x="12" y="34" font-family="Segoe UI, system-ui, sans-serif" font-size="10" fill="${sub}">${en.slice(0, 42)}</text>
      <text x="12" y="47" font-family="Segoe UI, system-ui, sans-serif" font-size="8.5" font-weight="600" letter-spacing="0.4" fill="${sub}">${typeLabel.toUpperCase()}</text>
    </g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}"><rect width="100%" height="100%" fill="#fcfcfb"/>${paths}${nodes}</svg>`;
}

export function buildHtml(layout: Layout, orientation: Orientation, title: string): string {
  const svg = buildSvg(layout, orientation);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} — Org chart</title>
<style>body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f4f5f9;color:#0f1129}
header{padding:20px 28px;background:#fff;border-bottom:1px solid #e4e8f0}
h1{margin:0;font-size:18px}.sub{color:#6b6f8a;font-size:13px;margin-top:2px}
.wrap{overflow:auto;padding:24px}</style></head>
<body><header><h1>${esc(title)}</h1><div class="sub">Organization structure · ${orientation} · generated by Gradex</div></header>
<div class="wrap">${svg}</div></body></html>`;
}
