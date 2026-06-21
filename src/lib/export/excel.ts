/**
 * Export jobs (with their full GGS grading answers) to a styled .xlsx workbook.
 * Client-side via exceljs (dynamically imported to keep it out of the bundle).
 */

import { FACTORS } from "@/lib/grading/factors";
import { getBand, type BandKey } from "@/lib/grading/bands";
import type { Evaluation, Family, Job } from "@/types";

interface BreakdownRow {
  id?: string;
  levelLabel?: string;
  levelIndex?: number;
}

export async function exportJobsToExcel(
  jobs: Job[],
  families: Family[],
  evaluations: (Evaluation & { jobId?: string | null })[],
  orgName = "Gradex",
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gradex";
  wb.created = new Date();
  const ws = wb.addWorksheet("Job grading", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const familyName = (id: string) => families.find((f) => f.id === id)?.name ?? "";
  const evalForJob = (job: Job) =>
    evaluations.find((e) => e.id === job.currentEvaluationId) ??
    evaluations.filter((e) => e.jobId === job.id).sort((a, b) => b.gradedAt - a.gradedAt)[0];

  const columns = [
    { header: "Job title", key: "title", width: 30 },
    { header: "Department", key: "family", width: 18 },
    { header: "Section", key: "section", width: 16 },
    { header: "Division", key: "division", width: 16 },
    { header: "Unit", key: "unit", width: 16 },
    { header: "Band", key: "band", width: 22 },
    { header: "Path", key: "path", width: 16 },
    { header: "Grade", key: "grade", width: 8 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Status", key: "status", width: 14 },
    ...FACTORS.map((f) => ({ header: f.name, key: f.id, width: 26 })),
    { header: "Raw score", key: "raw", width: 12 },
    { header: "Band window", key: "window", width: 12 },
    { header: "Flags", key: "flags", width: 40 },
  ];
  ws.columns = columns;

  for (const job of jobs) {
    const ev = evalForJob(job);
    const bd = (ev?.breakdown ?? []) as BreakdownRow[];
    const factorVals: Record<string, string> = {};
    for (const f of FACTORS) {
      const row = bd.find((b) => b.id === f.id);
      const idxFromSel = ev?.factorSelections?.[f.id];
      if (row && (row.levelIndex ?? -1) >= 0) {
        factorVals[f.id] = `L${(row.levelIndex ?? 0) + 1} · ${row.levelLabel ?? ""}`;
      } else if (typeof idxFromSel === "number") {
        const lv = f.levels[idxFromSel];
        factorVals[f.id] = `L${idxFromSel + 1} · ${lv?.label ?? ""}`;
      } else {
        factorVals[f.id] = "";
      }
    }
    const band = getBand(job.band as BandKey);
    ws.addRow({
      title: job.title,
      family: familyName(job.familyId),
      section: job.section ?? "",
      division: job.division ?? "",
      unit: job.unit ?? "",
      band: `${band.code} · ${band.name}`,
      path: job.careerPath === "M" ? "Management" : "Individual Contributor",
      grade: job.currentGrade ?? "",
      confidence: job.confidence ?? "",
      status: job.status,
      ...factorVals,
      raw: ev ? `${ev.rawScore} / ${ev.rMax}` : "",
      window: ev?.bandWindow ? `${ev.bandWindow.lo}–${ev.bandWindow.hi}` : "",
      flags: (job.flags ?? []).join(" | "),
    });
  }

  // Header styling
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5BF5" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF3B3BD0" } } };
  });

  // Body styling (zebra + borders + center grade)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 18;
    if (rowNumber % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F6FB" } };
      });
    }
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE7E9F2" } } };
    });
    const gradeCell = row.getCell("grade");
    gradeCell.alignment = { horizontal: "center", vertical: "middle" };
    gradeCell.font = { bold: true };
  });

  ws.autoFilter = { from: "A1", to: { row: 1, column: columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${orgName.replace(/\s+/g, "-").toLowerCase()}-job-grading.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/** Generic styled .xlsx export for any table. */
export async function exportTableToExcel(opts: {
  sheet: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  filename: string;
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gradex";
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheet.slice(0, 28), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = opts.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  for (const r of opts.rows) ws.addRow(r);

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B5BF5" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF3B3BD0" } } };
  });
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE7E9F2" } } };
      if (n % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F6FB" } };
    });
  });
  ws.autoFilter = { from: "A1", to: { row: 1, column: opts.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename.endsWith(".xlsx") ? opts.filename : `${opts.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
