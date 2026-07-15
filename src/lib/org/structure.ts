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

/**
 * Type colors follow the client's org-chart legend (eng.pdf): governance is
 * green, the executive board is red, offices brown, departments grey,
 * divisions/sections light grey, CoEs tan, tribes lime, functional areas
 * orange, processes dark orange, branches olive. Boxes are filled with these
 * colors and text auto-contrasts (see readableText).
 */
export const UNIT_TYPES: UnitTypeDef[] = [
  // Corporate
  { key: "parent_company", label: "Parent Company", labelAz: "Baş şirkət", group: "corporate", color: "#E23B36" },
  { key: "subsidiary", label: "Subsidiary", labelAz: "Törəmə", group: "corporate", color: "#3FA9E0" },
  { key: "company", label: "Company", labelAz: "Şirkət", group: "corporate", color: "#E23B36" },
  // Governance — green family
  { key: "governance_body", label: "Governance body", labelAz: "Ali orqan", group: "governance", color: "#2FA84F" },
  { key: "leadership", label: "Board of Directors", labelAz: "Rəhbərlik", group: "governance", color: "#E23B36" },
  { key: "committee", label: "Committee", labelAz: "Komitə", group: "governance", color: "#2FA84F" },
  { key: "commission", label: "Commission", labelAz: "Komissiya", group: "governance", color: "#2FA84F" },
  { key: "expert_group", label: "Expert group", labelAz: "Ekspert qrupu", group: "governance", color: "#2FA84F" },
  // Structural (non-agile)
  { key: "department", label: "Department", labelAz: "Departament", group: "non_agile", color: "#9AA08C" },
  { key: "division", label: "Division", labelAz: "Şöbə", group: "non_agile", color: "#D5D8CD" },
  { key: "section", label: "Section", labelAz: "Bölmə", group: "non_agile", color: "#D5D8CD" },
  { key: "unit", label: "Unit", labelAz: "Vahid", group: "non_agile", color: "#D5D8CD" },
  { key: "office", label: "Office", labelAz: "Ofis / İdarə", group: "non_agile", color: "#6E4B2A" },
  { key: "process", label: "Process", labelAz: "Proses", group: "non_agile", color: "#C0561E" },
  { key: "branches", label: "Branches", labelAz: "Yerli bölmələr", group: "non_agile", color: "#6F8B1F" },
  // Agile
  { key: "tribe", label: "Tribe", labelAz: "Sahə", group: "agile", color: "#C3E252" },
  { key: "functional_area", label: "Functional area", labelAz: "Funksional sahə", group: "agile", color: "#E88A3C" },
  { key: "coe", label: "CoE", labelAz: "Ekspert mərkəzi", group: "agile", color: "#E7C98C" },
  { key: "squad", label: "Squad", labelAz: "Skvad", group: "agile", color: "#C3E252" },
  { key: "chapter", label: "Chapter", labelAz: "Çapter", group: "agile", color: "#5FC9C0" },
  { key: "guild", label: "Guild", labelAz: "Gild", group: "agile", color: "#5FC9C0" },
];

/** True luminance-based text color for a filled box (WCAG-ish threshold). */
export function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) / 255, g = parseInt(n.slice(2, 4), 16) / 255, b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#1a1c2e" : "#ffffff";
}

/**
 * Color for a specific unit. Same as the type color, except a plain "Deputy
 * Chairman of the Board" (no additional Chief role) is blue, matching the
 * client legend where deputies are a distinct category.
 */
export function unitColor(type: string, name?: string, nameEn?: string): string {
  if (type === "leadership") {
    const plainDeputy = /^(deputy chairman of the board|idar[əe] hey[əe]ti s[əe]drinin m[üu]avini)$/i;
    if ((name && plainDeputy.test(name.trim())) || (nameEn && plainDeputy.test(nameEn.trim()))) return "#3FA9E0";
  }
  return typeDef(type).color;
}

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
