/**
 * Excel template + parser for bulk-uploading an org structure.
 * The template is a simple path layout — each row is one branch; columns go
 * Parent Company → Subsidiary → Department → Section → Division → Unit. Blank
 * cells inherit the row above's branch. Employees/Vacancies apply to the
 * deepest filled cell in the row.
 */

const LEVELS: { header: string; type: string }[] = [
  { header: "Parent Company", type: "parent_company" },
  { header: "Subsidiary", type: "subsidiary" },
  { header: "Department", type: "department" },
  { header: "Section", type: "section" },
  { header: "Division", type: "division" },
  { header: "Unit", type: "unit" },
];

export interface ParsedNode {
  tmpId: string;
  name: string;
  type: string;
  parentTmp: string | null;
  headcount: number;
  vacancies: number;
}

export async function downloadStructureTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Structure", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    ...LEVELS.map((l) => ({ header: l.header, key: l.type, width: 22 })),
    { header: "Employees", key: "employees", width: 12 },
    { header: "Vacancies", key: "vacancies", width: 12 },
  ];
  ws.addRow({ parent_company: "Acme Group", subsidiary: "Acme Azerbaijan", department: "Finance", section: "Accounting", employees: 12, vacancies: 2 });
  ws.addRow({ parent_company: "Acme Group", subsidiary: "Acme Azerbaijan", department: "Finance", section: "Treasury", employees: 6, vacancies: 1 });
  ws.addRow({ parent_company: "Acme Group", subsidiary: "Acme Azerbaijan", department: "Technology", division: "Platform", unit: "Payments", employees: 20, vacancies: 3 });
  ws.addRow({ parent_company: "Acme Group", subsidiary: "Acme Georgia", department: "Sales", employees: 9, vacancies: 0 });

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5BF5" } };
    c.font = { color: { argb: "FFFFFFFF" }, bold: true };
    c.alignment = { vertical: "middle" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "org-structure-template.xlsx"; a.click();
  URL.revokeObjectURL(url);
}

export async function parseStructure(file: File): Promise<ParsedNode[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The file has no sheets.");

  // Map headers → column numbers.
  const headerRow = ws.getRow(1);
  const colByHeader = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    colByHeader.set(String(cell.value ?? "").trim().toLowerCase(), col);
  });
  const levelCols = LEVELS.map((l) => ({ ...l, col: colByHeader.get(l.header.toLowerCase()) }));
  if (!levelCols.some((l) => l.col)) throw new Error("Couldn't find the structure columns. Use the provided template.");
  const empCol = colByHeader.get("employees");
  const vacCol = colByHeader.get("vacancies");

  const text = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "object" && v && "text" in v) return String((v as { text: string }).text).trim();
    return String(v).trim();
  };
  const num = (v: unknown): number => {
    const n = Number(typeof v === "object" && v && "result" in v ? (v as { result: unknown }).result : v);
    return Number.isFinite(n) ? n : 0;
  };

  const map = new Map<string, ParsedNode>();
  const nodes: ParsedNode[] = [];
  let counter = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    let parentTmp: string | null = null;
    let deepest: ParsedNode | null = null;
    for (const lvl of levelCols) {
      if (!lvl.col) continue;
      const name = text(row.getCell(lvl.col).value);
      if (!name) continue;
      const key = `${parentTmp ?? "root"}|${lvl.type}:${name.toLowerCase()}`;
      let node = map.get(key);
      if (!node) {
        node = { tmpId: `t${counter++}`, name, type: lvl.type, parentTmp, headcount: 0, vacancies: 0 };
        map.set(key, node);
        nodes.push(node);
      }
      parentTmp = node.tmpId;
      deepest = node;
    }
    if (deepest) {
      if (empCol) deepest.headcount = num(row.getCell(empCol).value);
      if (vacCol) deepest.vacancies = num(row.getCell(vacCol).value);
    }
  });

  if (nodes.length === 0) throw new Error("No structure rows found in the file.");
  return nodes;
}
