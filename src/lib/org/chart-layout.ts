/**
 * Org-chart layout engine — pure, orientation-aware tidy tree.
 * Used by the interactive chart and by the SVG/HTML export so both stay in sync.
 */

import { typeDef, groupColorOf, type OrgNode, type OrgUnit } from "./structure";

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
            color: groupColorOf(t),
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
      id: n.id, name: n.name, nameEn: n.nameEn, type: n.type, color: groupColorOf(n.type),
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
export interface Edge { id: string; x1: number; y1: number; x2: number; y2: number; dashed?: boolean }
export interface Layout { placed: Placed[]; edges: Edge[]; width: number; height: number }

export function computeLayout(roots: ANode[], orientation: Orientation, isOpen: (n: ANode) => boolean): Layout {
  const horiz = orientation === "horizontal";
  const stepAlong = horiz ? 258 : 108;   // spacing per depth
  const stepCross = horiz ? 66 : 236;     // spacing per leaf slot
  const placed: Placed[] = [];
  const edges: Edge[] = [];
  const byId = new Map<string, Placed>();
  let cross = 0;

  const place = (n: ANode, depth: number): number => {
    const open = isOpen(n);
    const kids = open ? n.children : [];
    const along = depth * stepAlong;
    let c: number;
    if (kids.length === 0) { c = cross * stepCross; cross++; }
    else { const cs = kids.map((k) => place(k, depth + 1)); c = (cs[0] + cs[cs.length - 1]) / 2; }
    const x = horiz ? along : c;
    const y = horiz ? c : along;
    const p: Placed = { node: n, x, y, hasKids: n.children.length > 0, open, hidden: countA(n) };
    placed.push(p); byId.set(n.id, p);
    for (const k of kids) {
      const cp = byId.get(k.id)!;
      edges.push(horiz
        ? { id: `${n.id}-${k.id}`, x1: x + NODE_W, y1: y + NODE_H / 2, x2: cp.x, y2: cp.y + NODE_H / 2 }
        : { id: `${n.id}-${k.id}`, x1: x + NODE_W / 2, y1: y + NODE_H, x2: cp.x + NODE_W / 2, y2: cp.y });
    }
    return c;
  };
  roots.forEach((r) => place(r, 0));

  // functional (dotted) links
  for (const p of placed) {
    const links = p.node.functionalLinks;
    if (!links?.length) continue;
    for (const t of links) {
      const b = byId.get(t);
      if (b) edges.push({ id: `f-${p.node.id}-${t}`, x1: p.x + NODE_W / 2, y1: p.y + NODE_H, x2: b.x + NODE_W / 2, y2: b.y, dashed: true });
    }
  }

  const width = Math.max(1, ...placed.map((p) => p.x + NODE_W)) + 20;
  const height = Math.max(1, ...placed.map((p) => p.y + NODE_H)) + 20;
  return { placed, edges, width, height };
}

export function edgePath(e: Edge, orientation: Orientation): string {
  if (orientation === "horizontal") {
    const mx = (e.x1 + e.x2) / 2;
    return `M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2} ${e.y2}`;
  }
  const my = (e.y1 + e.y2) / 2;
  return `M ${e.x1} ${e.y1} C ${e.x1} ${my}, ${e.x2} ${my}, ${e.x2} ${e.y2}`;
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Serialize a layout to a standalone SVG string (light theme, for export). */
export function buildSvg(layout: Layout, orientation: Orientation): string {
  const { placed, edges, width, height } = layout;
  const paths = edges.map((e) =>
    `<path d="${edgePath(e, orientation)}" fill="none" stroke="${e.dashed ? "#5B5BF5" : "#cbd2e0"}" stroke-width="1.5"${e.dashed ? ' stroke-dasharray="5 4" opacity="0.6"' : ""}/>`,
  ).join("");
  const nodes = placed.map(({ node, x, y }) => {
    const c = node.color;
    const az = esc(node.name);
    const en = esc(node.nameEn ?? "");
    const typeLabel = esc(node.isGroup ? "Group" : typeDef(node.type).label);
    return `<g transform="translate(${x},${y})">
      <rect width="${NODE_W}" height="${NODE_H}" rx="8" fill="#ffffff" stroke="${node.isGroup ? c : "#e4e8f0"}" ${node.isGroup ? 'stroke-dasharray="4 3"' : ""}/>
      <rect width="5" height="${NODE_H}" rx="2.5" fill="${c}"/>
      <text x="14" y="19" font-family="Segoe UI, system-ui, sans-serif" font-size="12.5" font-weight="600" fill="#0f1129">${az.slice(0, 34)}</text>
      <text x="14" y="34" font-family="Segoe UI, system-ui, sans-serif" font-size="10.5" fill="#6b6f8a">${en.slice(0, 40)}</text>
      <text x="14" y="47" font-family="Segoe UI, system-ui, sans-serif" font-size="9" font-weight="600" fill="${c}">${typeLabel}</text>
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
