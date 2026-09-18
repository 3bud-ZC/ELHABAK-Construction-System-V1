import ExcelJS from "exceljs";

/**
 * ELHABAK V6 - register export builders.
 *
 * Serializes authorized rows to .xlsx (ExcelJS) or RFC-4180 CSV. Every user-controlled
 * string cell is sanitized against spreadsheet formula injection before writing: a
 * value whose first non-space character is = + - @ (or a leading tab/CR) is prefixed
 * with a single quote so Excel/Calc treat it as text, never as a formula.
 */

export type ExportColumn = {
  key: string;
  header: string;
  width?: number;
};

export type ExportDataset = {
  name: string;
  columns: ExportColumn[];
  rows: Array<Record<string, string | number | null>>;
};

const EXECUTABLE_PREFIX = /^[\s\u00a0]*[=+\-@\t\r]/;

export function sanitizeCell(value: string): string {
  if (!value) return value;
  return EXECUTABLE_PREFIX.test(value) ? `'${value}` : value;
}

function csvEscape(value: string): string {
  const sanitized = sanitizeCell(value);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function buildCsv(dataset: ExportDataset): Buffer {
  const lines: string[] = [];
  lines.push(dataset.columns.map((column) => csvEscape(column.header)).join(","));
  for (const row of dataset.rows) {
    lines.push(
      dataset.columns
        .map((column) => {
          const value = row[column.key];
          if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
          }
          return csvEscape(value === null || value === undefined ? "" : String(value));
        })
        .join(",")
    );
  }
  // Prepend BOM so Excel opens UTF-8 Arabic content correctly.
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(lines.join("\r\n"), "utf8")]);
}

export async function buildXlsx(dataset: ExportDataset): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ELHABAK Construction System";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(dataset.name.slice(0, 31) || "Export", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.columns = dataset.columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width ?? Math.min(42, Math.max(12, column.header.length + 4))
  }));

  sheet.getRow(1).font = { bold: true };

  for (const row of dataset.rows) {
    const record: Record<string, string | number> = {};
    for (const column of dataset.columns) {
      const value = row[column.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        record[column.key] = value;
      } else {
        record[column.key] = sanitizeCell(value === null || value === undefined ? "" : String(value));
      }
    }
    sheet.addRow(record);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportFilename(dataset: string, format: "xlsx" | "csv"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `elhabak-${dataset}-${stamp}.${format}`;
}
