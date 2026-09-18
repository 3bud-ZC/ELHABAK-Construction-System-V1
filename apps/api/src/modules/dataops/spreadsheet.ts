import { BadRequestException } from "@nestjs/common";
import ExcelJS from "exceljs";

/**
 * ELHABAK V6 - spreadsheet import engine.
 *
 * Pure, dependency-light parsing layer: turns an uploaded .xlsx/.csv buffer into a
 * normalized sheet model (headers + rows of string cells) that the validators in
 * import-validation.ts can check without any database access. Hard limits guard
 * against oversized files, sheet bombs, and huge grids; spreadsheet formulas are
 * never evaluated - a formula cell is flagged so the row-level validator can reject
 * it where a raw business value is required.
 */

export const IMPORT_LIMITS = {
  maxFileBytes: 8 * 1024 * 1024,
  maxSheets: 5,
  maxRows: 2000,
  maxColumns: 40,
  maxCellLength: 2000
} as const;

export type ParsedCell = {
  text: string;
  isFormula: boolean;
};

export type ParsedRow = {
  /** 1-based index of the data row (header row = 1, first data row = 2). */
  index: number;
  cells: ParsedCell[];
};

export type ParsedSheet = {
  name: string;
  /** Raw header labels, trimmed; may be empty strings for blank columns. */
  headers: string[];
  rows: ParsedRow[];
};

export type ParsedWorkbook = {
  kind: "xlsx" | "csv";
  fileName: string;
  sheets: ParsedSheet[];
};

export function parseSpreadsheetUpload(file: { originalname: string; buffer: Buffer; size: number }): Promise<ParsedWorkbook> {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException("Import file is empty.");
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new BadRequestException("Import file exceeds the maximum allowed size.");
  }
  const lower = file.originalname.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return parseXlsx(file);
  }
  if (lower.endsWith(".csv")) {
    return Promise.resolve(parseCsv(file));
  }
  throw new BadRequestException("Only .xlsx and .csv import files are supported.");
}

async function parseXlsx(file: { originalname: string; buffer: Buffer }): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException("The uploaded file is not a readable .xlsx workbook.");
  }
  if (workbook.worksheets.length === 0) {
    throw new BadRequestException("The workbook contains no sheets.");
  }
  if (workbook.worksheets.length > IMPORT_LIMITS.maxSheets) {
    throw new BadRequestException(`The workbook has more than ${IMPORT_LIMITS.maxSheets} sheets.`);
  }

  const sheets: ParsedSheet[] = workbook.worksheets.map((sheet) => {
    const grid: ParsedCell[][] = [];
    let headerIndex = -1;

    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: ParsedCell[] = [];
      for (let column = 1; column <= Math.min(row.cellCount, IMPORT_LIMITS.maxColumns); column += 1) {
        cells.push(readCell(row.getCell(column)));
      }
      while (cells.length > 0 && cells[cells.length - 1]!.text === "" && !cells[cells.length - 1]!.isFormula) {
        cells.pop();
      }
      if (cells.length > 0) {
        grid.push(cells);
        if (headerIndex === -1) headerIndex = grid.length - 1;
      }
    });

    if (headerIndex === -1) {
      return { name: sheet.name, headers: [], rows: [] };
    }

    const headers = grid[headerIndex]!.map((cell) => cell.text.trim());
    const dataRows = grid
      .slice(headerIndex + 1)
      .filter((cells) => cells.some((cell) => cell.text !== "" || cell.isFormula))
      .slice(0, IMPORT_LIMITS.maxRows + 1)
      .map((cells, offset) => ({ index: headerIndex + 2 + offset, cells }));

    if (dataRows.length > IMPORT_LIMITS.maxRows) {
      throw new BadRequestException(`Sheet "${sheet.name}" exceeds ${IMPORT_LIMITS.maxRows} data rows.`);
    }

    return { name: sheet.name, headers, rows: dataRows };
  });

  const nonEmpty = sheets.filter((sheet) => sheet.rows.length > 0);
  if (nonEmpty.length === 0) {
    throw new BadRequestException("The workbook contains no data rows.");
  }

  return { kind: "xlsx", fileName: file.originalname, sheets };
}

function readCell(cell: ExcelJS.Cell): ParsedCell {
  const type = cell.type;
  if (type === ExcelJS.ValueType.Formula) {
    return { text: "", isFormula: true };
  }
  const value = cell.value;
  if (value === null || value === undefined) {
    return { text: "", isFormula: false };
  }
  if (value instanceof Date) {
    return { text: toIsoDate(value), isFormula: false };
  }
  if (type === ExcelJS.ValueType.RichText) {
    return { text: truncate((value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join("")), isFormula: false };
  }
  if (type === ExcelJS.ValueType.Hyperlink) {
    return { text: truncate(String((value as ExcelJS.CellHyperlinkValue).text ?? "")), isFormula: false };
  }
  if (type === ExcelJS.ValueType.Error) {
    return { text: "", isFormula: true };
  }
  return { text: truncate(cell.text), isFormula: false };
}

function truncate(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > IMPORT_LIMITS.maxCellLength ? trimmed.slice(0, IMPORT_LIMITS.maxCellLength) : trimmed;
}

function toIsoDate(value: Date): string {
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * RFC-4180-compliant CSV reader: quoted fields, escaped quotes, CRLF/LF line endings,
 * and a leading BOM. The delimiter is auto-detected between comma and semicolon based
 * on the header row so exports from regional Excel builds keep working.
 */
export function parseCsv(file: { originalname: string; buffer: Buffer }): ParsedWorkbook {
  let text = file.buffer.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  const grid: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      grid.push(row);
      row = [];
      if (grid.length > IMPORT_LIMITS.maxRows + 1) {
        throw new BadRequestException(`The CSV file exceeds ${IMPORT_LIMITS.maxRows} data rows.`);
      }
    } else {
      field += char;
    }
  }
  if (inQuotes) {
    throw new BadRequestException("The CSV file has an unterminated quoted field.");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    grid.push(row);
  }

  const nonEmptyGrid = grid.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmptyGrid.length === 0) {
    throw new BadRequestException("The CSV file contains no data rows.");
  }

  const headers = nonEmptyGrid[0]!.map((cell) => cell.trim());
  if (headers.length > IMPORT_LIMITS.maxColumns) {
    throw new BadRequestException(`The CSV file exceeds ${IMPORT_LIMITS.maxColumns} columns.`);
  }

  const rows: ParsedRow[] = nonEmptyGrid.slice(1).map((cells, offset) => ({
    index: offset + 2,
    cells: cells.map((cell) => ({ text: cell.trim().slice(0, IMPORT_LIMITS.maxCellLength), isFormula: false }))
  }));

  if (rows.length > IMPORT_LIMITS.maxRows) {
    throw new BadRequestException(`The CSV file exceeds ${IMPORT_LIMITS.maxRows} data rows.`);
  }

  return { kind: "csv", fileName: file.originalname, sheets: [{ name: "Sheet1", headers, rows }] };
}

/** Normalizes a raw header/cell label for alias matching (case/diacritic-insensitive). */
export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Maps sheet headers onto canonical import fields using the alias table.
 * Returns canonicalField -> column index (-1 when absent) plus headers left unmapped.
 */
export function autoMapHeaders(
  headers: string[],
  aliases: Record<string, string[]>
): { mapping: Record<string, number>; unmappedHeaders: string[] } {
  const normalized = headers.map((header) => normalizeHeader(header));
  const mapping: Record<string, number> = {};
  const used = new Set<number>();

  for (const [field, names] of Object.entries(aliases)) {
    mapping[field] = -1;
    for (const alias of names) {
      const target = normalizeHeader(alias);
      const index = normalized.findIndex((header, i) => !used.has(i) && header === target);
      if (index !== -1) {
        mapping[field] = index;
        used.add(index);
        break;
      }
    }
  }

  return { mapping, unmappedHeaders: headers.filter((_, i) => !used.has(i)) };
}

/** Projects a parsed row into a canonical-field record using a column mapping. */
export function rowToRecord(
  row: ParsedRow,
  mapping: Record<string, number>
): { record: Record<string, string>; formulaFields: string[] } {
  const record: Record<string, string> = {};
  const formulaFields: string[] = [];
  for (const [field, column] of Object.entries(mapping)) {
    const cell = column >= 0 ? row.cells[column] : undefined;
    record[field] = cell?.text ?? "";
    if (cell?.isFormula) formulaFields.push(field);
  }
  return { record, formulaFields };
}
