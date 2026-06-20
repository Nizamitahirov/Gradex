/**
 * Employee data: downloadable .xlsx template + parser. Client-side (exceljs).
 */

import type { EmployeeInput } from "./analytics";

const COLUMNS = [
  { header: "Emp Badge", key: "badge", width: 12 },
  { header: "Full Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Division", key: "division", width: 18 },
  { header: "Team", key: "team", width: 18 },
  { header: "Position", key: "position", width: 28 },
  { header: "Start Date", key: "startDate", width: 14 },
  { header: "Birth Date", key: "birthDate", width: 14 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Gross Salary (annual)", key: "grossSalary", width: 18 },
];

export async function downloadEmployeeTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Employees");
  ws.columns = COLUMNS;
  ws.addRow({
    badge: "E1001",
    name: "Jane Cooper",
    department: "Finance",
    division: "Corporate",
    team: "FP&A",
    position: "Financial Analyst",
    startDate: "2021-03-15",
    birthDate: "1990-07-02",
    gender: "Female",
    grossSalary: 62000,
  });
  ws.addRow({
    badge: "E1002",
    name: "John Smith",
    department: "Engineering",
    division: "Product",
    team: "Platform",
    position: "Software Engineer",
    startDate: "2019-09-01",
    birthDate: "1988-01-20",
    gender: "Male",
    grossSalary: 84000,
  });
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5BF5" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle" };
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gradex-employee-template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

const FIELD_ALIASES: Record<keyof EmployeeInput, string[]> = {
  badge: ["emp badge", "badge", "employee id", "id", "emp id"],
  name: ["full name", "name", "employee name"],
  department: ["department", "dept"],
  division: ["division", "div"],
  team: ["team"],
  position: ["position", "job title", "title", "role"],
  startDate: ["start date", "hire date", "joining date"],
  birthDate: ["birth date", "dob", "date of birth"],
  gender: ["gender", "sex"],
  grossSalary: ["gross salary (annual)", "gross salary", "salary", "annual salary", "gross"],
};

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text);
  if (typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result);
  return String(v);
}

export async function parseEmployees(file: File): Promise<EmployeeInput[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  // Map column index → field via header row.
  const headerRow = ws.getRow(1);
  const colField: Record<number, keyof EmployeeInput> = {};
  headerRow.eachCell((cell, col) => {
    const h = cellToString(cell.value).trim().toLowerCase();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof EmployeeInput, string[]][]) {
      if (aliases.includes(h)) {
        colField[col] = field;
        break;
      }
    }
  });

  const out: EmployeeInput[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const e: EmployeeInput = {};
    let any = false;
    row.eachCell((cell, col) => {
      const field = colField[col];
      if (!field) return;
      const raw = cellToString(cell.value).trim();
      if (!raw) return;
      any = true;
      if (field === "grossSalary") e.grossSalary = Number(raw.replace(/[^0-9.-]/g, "")) || 0;
      else e[field] = raw;
    });
    if (any) out.push(e);
  });
  return out;
}
