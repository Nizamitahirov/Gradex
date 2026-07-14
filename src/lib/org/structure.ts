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
export type TypeGroup = "corporate" | "governance" | "non_agile" | "agile";

export interface OrgUnit {
  id: string;
  name: string;
  /** Optional secondary (e.g. English) name. */
  nameEn?: string;
  type: string;
  parentId: string | null;
  functionalLinks?: string[];
  headcount?: number;
  vacancies?: number;
  /** Depth level from the source (informational). */
  level?: number;
  order?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface UnitTypeDef {
  key: string;
  label: string;
  labelAz?: string;
  group: TypeGroup;
  color: string;
}

export const UNIT_TYPES: UnitTypeDef[] = [
  // Corporate
  { key: "parent_company", label: "Parent Company", labelAz: "Baş şirkət", group: "corporate", color: "#5B5BF5" },
  { key: "subsidiary", label: "Subsidiary", labelAz: "Törəmə", group: "corporate", color: "#7C6CF6" },
  { key: "company", label: "Company", labelAz: "Şirkət", group: "corporate", color: "#6366F1" },
  // Governance
  { key: "governance_body", label: "Governance body", labelAz: "Ali orqan", group: "governance", color: "#5B5BF5" },
  { key: "leadership", label: "Leadership", labelAz: "Rəhbərlik", group: "governance", color: "#4338CA" },
  { key: "committee", label: "Committee", labelAz: "Komitə", group: "governance", color: "#6366F1" },
  { key: "commission", label: "Commission", labelAz: "Komissiya", group: "governance", color: "#8B5CF6" },
  { key: "expert_group", label: "Expert group", labelAz: "Ekspert qrupu", group: "governance", color: "#7C3AED" },
  // Structural (non-agile)
  { key: "department", label: "Department", labelAz: "Departament", group: "non_agile", color: "#3B82F6" },
  { key: "division", label: "Division", labelAz: "Şöbə", group: "non_agile", color: "#0EA5E9" },
  { key: "section", label: "Section", labelAz: "Bölmə", group: "non_agile", color: "#06B6D4" },
  { key: "unit", label: "Unit", labelAz: "Vahid", group: "non_agile", color: "#F59E0B" },
  { key: "office", label: "Office", labelAz: "Ofis / İdarə", group: "non_agile", color: "#14B8A6" },
  { key: "process", label: "Process", labelAz: "Proses", group: "non_agile", color: "#64748B" },
  { key: "branches", label: "Branches", labelAz: "Yerli bölmələr", group: "non_agile", color: "#0D9488" },
  // Agile
  { key: "tribe", label: "Tribe", labelAz: "Sahə", group: "agile", color: "#EC4899" },
  { key: "functional_area", label: "Functional area", labelAz: "Funksional sahə", group: "agile", color: "#A855F7" },
  { key: "coe", label: "CoE", labelAz: "Ekspert mərkəzi", group: "agile", color: "#16C098" },
  { key: "squad", label: "Squad", labelAz: "Skvad", group: "agile", color: "#F472B6" },
  { key: "chapter", label: "Chapter", labelAz: "Çapter", group: "agile", color: "#22D3EE" },
  { key: "guild", label: "Guild", labelAz: "Gild", group: "agile", color: "#2DD4BF" },
];

export const GROUP_LABEL: Record<TypeGroup, string> = {
  corporate: "Corporate",
  governance: "Governance",
  non_agile: "Structural",
  agile: "Agile",
};

/** Validated categorical palette (dataviz skill, light-mode checks all pass). */
export const GROUP_COLOR: Record<TypeGroup, string> = {
  governance: "#4F46E5",
  non_agile: "#0891B2",
  corporate: "#D97706",
  agile: "#DB2777",
};

export function groupColorOf(typeKey: string): string {
  return GROUP_COLOR[typeDef(typeKey).group];
}

/** Maps the English type strings used in the bulk edge-list export to type keys. */
export const EXCEL_TYPE_MAP: Record<string, string> = {
  "governance body": "governance_body",
  "leadership": "leadership",
  "committee": "committee",
  "commission": "commission",
  "expert group": "expert_group",
  "department": "department",
  "division": "division",
  "section": "section",
  "unit": "unit",
  "office": "office",
  "process": "process",
  "branches": "branches",
  "tribe": "tribe",
  "functional area": "functional_area",
  "coe": "coe",
  "squad": "squad",
  "chapter": "chapter",
  "guild": "guild",
  "parent company": "parent_company",
  "subsidiary": "subsidiary",
  "company": "company",
};

export function excelTypeToKey(typeEn: string): string {
  return EXCEL_TYPE_MAP[typeEn.trim().toLowerCase()] ?? "unit";
}

export function typeDef(key: string): UnitTypeDef {
  return UNIT_TYPES.find((t) => t.key === key) ?? UNIT_TYPES[UNIT_TYPES.length - 1];
}

export function typesByGroup(): { group: TypeGroup; label: string; types: UnitTypeDef[] }[] {
  return (["corporate", "governance", "non_agile", "agile"] as TypeGroup[]).map((g) => ({
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
