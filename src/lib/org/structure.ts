/**
 * Organization structure model — shared by client and server.
 *
 * Node types are grouped into three families:
 *  - corporate:  Parent Company → Subsidiary → Company
 *  - non_agile:  Department → Section → Division → Unit
 *  - agile:      Tribe / Functional Area → Squad → Chapter → Guild
 *
 * A single org can mix branches (e.g. a subsidiary running an agile tribe and a
 * functional department side by side). Nodes form a solid-line hierarchy
 * (parentId); functionalLinks are dotted-line cross relationships.
 */

export type StructureMode = "functional" | "agile";
export type TypeGroup = "corporate" | "non_agile" | "agile";

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
  group: TypeGroup;
  color: string;
}

export const UNIT_TYPES: UnitTypeDef[] = [
  // Corporate
  { key: "parent_company", label: "Parent Company", group: "corporate", color: "#5B5BF5" },
  { key: "subsidiary", label: "Subsidiary", group: "corporate", color: "#7C6CF6" },
  { key: "company", label: "Company", group: "corporate", color: "#6366F1" },
  // Non-agile
  { key: "department", label: "Department", group: "non_agile", color: "#3B82F6" },
  { key: "section", label: "Section", group: "non_agile", color: "#06B6D4" },
  { key: "division", label: "Division", group: "non_agile", color: "#10B981" },
  { key: "unit", label: "Unit", group: "non_agile", color: "#F59E0B" },
  // Agile
  { key: "tribe", label: "Tribe", group: "agile", color: "#8B5CF6" },
  { key: "functional_area", label: "Functional Area", group: "agile", color: "#A855F7" },
  { key: "squad", label: "Squad", group: "agile", color: "#EC4899" },
  { key: "chapter", label: "Chapter", group: "agile", color: "#06B6D4" },
  { key: "guild", label: "Guild", group: "agile", color: "#16C098" },
];

export const GROUP_LABEL: Record<TypeGroup, string> = {
  corporate: "Corporate",
  non_agile: "Non-agile",
  agile: "Agile",
};

export function typeDef(key: string): UnitTypeDef {
  return UNIT_TYPES.find((t) => t.key === key) ?? UNIT_TYPES[UNIT_TYPES.length - 1];
}

export function typesByGroup(): { group: TypeGroup; label: string; types: UnitTypeDef[] }[] {
  return (["corporate", "non_agile", "agile"] as TypeGroup[]).map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    types: UNIT_TYPES.filter((t) => t.group === g),
  }));
}

const NEXT_TYPE: Record<string, string> = {
  parent_company: "subsidiary",
  subsidiary: "department",
  company: "department",
  department: "section",
  section: "division",
  division: "unit",
  unit: "unit",
  tribe: "squad",
  functional_area: "squad",
  squad: "chapter",
  chapter: "guild",
  guild: "guild",
};

/** A sensible default child type for the given parent (overridable in the UI). */
export function childTypeOf(parentType: string | null): string {
  if (!parentType) return "parent_company";
  return NEXT_TYPE[parentType] ?? "unit";
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
