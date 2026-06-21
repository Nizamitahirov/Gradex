/**
 * Organization structure model — shared by client and server.
 * A company can be modelled in two ways:
 *  - "functional": Company → Department → Section → Division → Unit
 *  - "agile":      Company → Tribe → Squad → Chapter → Guild
 * Nodes form a solid-line hierarchy (parentId); functionalLinks are
 * dotted-line cross relationships.
 */

export type StructureMode = "functional" | "agile";

export interface OrgUnit {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  functionalLinks?: string[];
  headcount?: number;
  vacancies?: number;
  order?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface UnitTypeDef {
  key: string;
  label: string;
  level: number;
  color: string;
}

export const FUNCTIONAL_TYPES: UnitTypeDef[] = [
  { key: "company", label: "Company", level: 0, color: "#5B5BF5" },
  { key: "department", label: "Department", level: 1, color: "#3B82F6" },
  { key: "section", label: "Section", level: 2, color: "#06B6D4" },
  { key: "division", label: "Division", level: 3, color: "#10B981" },
  { key: "unit", label: "Unit", level: 4, color: "#F59E0B" },
];

export const AGILE_TYPES: UnitTypeDef[] = [
  { key: "company", label: "Company", level: 0, color: "#5B5BF5" },
  { key: "tribe", label: "Tribe", level: 1, color: "#8B5CF6" },
  { key: "squad", label: "Squad", level: 2, color: "#EC4899" },
  { key: "chapter", label: "Chapter", level: 3, color: "#06B6D4" },
  { key: "guild", label: "Guild", level: 4, color: "#16C098" },
];

export function typesFor(mode: StructureMode): UnitTypeDef[] {
  return mode === "agile" ? AGILE_TYPES : FUNCTIONAL_TYPES;
}

export function typeDef(mode: StructureMode, key: string): UnitTypeDef {
  return typesFor(mode).find((t) => t.key === key) ?? typesFor(mode)[typesFor(mode).length - 1];
}

/** The default child type for a node of the given type (next level down). */
export function childTypeOf(mode: StructureMode, parentType: string | null): string {
  const types = typesFor(mode);
  if (!parentType) return types[0].key;
  const idx = types.findIndex((t) => t.key === parentType);
  return types[Math.min(idx + 1, types.length - 1)].key;
}

export interface OrgNode extends OrgUnit {
  children: OrgNode[];
  depth: number;
}

/** Build a tree from a flat list. Orphans are treated as roots. */
export function buildTree(units: OrgUnit[]): OrgNode[] {
  const byId = new Map<string, OrgNode>();
  units.forEach((u) => byId.set(u.id, { ...u, children: [], depth: 0 }));
  const roots: OrgNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: OrgNode[], depth: number) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    nodes.forEach((n) => { n.depth = depth; sortRec(n.children, depth + 1); });
  };
  sortRec(roots, 0);
  return roots;
}

/** All descendant ids of a node (to prevent cyclic re-parenting). */
export function descendantIds(units: OrgUnit[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const u of units) {
    if (!u.parentId) continue;
    childrenOf.set(u.parentId, [...(childrenOf.get(u.parentId) ?? []), u.id]);
  }
  const out = new Set<string>();
  const walk = (n: string) => {
    for (const c of childrenOf.get(n) ?? []) {
      if (!out.has(c)) { out.add(c); walk(c); }
    }
  };
  walk(id);
  return out;
}
