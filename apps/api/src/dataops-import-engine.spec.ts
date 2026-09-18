import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  IMPORT_LIMITS,
  autoMapHeaders,
  normalizeHeader,
  parseCsv,
  parseSpreadsheetUpload,
  rowToRecord,
  type ParsedRow
} from "./modules/dataops/spreadsheet";
import {
  CLIENT_FIELD_ALIASES,
  firstSeenKeys,
  isValidEmail,
  lookupBoqUnit,
  normalizePhone,
  parseBooleanFlag,
  parseImportDate,
  previewLineTotal,
  validateBoqRow,
  validateClientRow,
  validateProjectRow,
  type BoqImportRow
} from "./modules/dataops/import-validation";
import { buildCsv, buildXlsx, exportFilename, sanitizeCell, type ExportDataset } from "./modules/dataops/export-builders";

/**
 * V6 data-operations engine — pure unit coverage.
 *
 * These tests exercise the DB-free layers only (parsing, row validation, export
 * serialization). They never open a Prisma connection and never mutate any record,
 * so they are safe to run against the production database URL.
 */

const csvFile = (text: string, name = "import.csv") => ({
  originalname: name,
  buffer: Buffer.from(text, "utf8"),
  size: Buffer.byteLength(text)
});

describe("spreadsheet: CSV parsing", () => {
  it("parses headers and trimmed rows", () => {
    const parsed = parseCsv(csvFile("name,email\n Ahmed , a@b.com \n\nSara,s@b.com\n"));
    expect(parsed.kind).toBe("csv");
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0]!.headers).toEqual(["name", "email"]);
    expect(parsed.sheets[0]!.rows).toHaveLength(2);
    expect(parsed.sheets[0]!.rows[0]!.cells.map((c) => c.text)).toEqual(["Ahmed", "a@b.com"]);
  });

  it("handles quoted fields, escaped quotes, embedded newlines, and CRLF", () => {
    const parsed = parseCsv(csvFile('name,notes\r\n"Ali, Jr.","line one\nline ""two"""\r\nSam,x\n'));
    expect(parsed.sheets[0]!.rows).toHaveLength(2);
    expect(parsed.sheets[0]!.rows[0]!.cells.map((c) => c.text)).toEqual(["Ali, Jr.", 'line one\nline "two"']);
  });

  it("detects semicolon-delimited regional exports", () => {
    const parsed = parseCsv(csvFile("name;email\nAhmed;a@b.com\n"));
    expect(parsed.sheets[0]!.headers).toEqual(["name", "email"]);
    expect(parsed.sheets[0]!.rows[0]!.cells[1]!.text).toBe("a@b.com");
  });

  it("strips a UTF-8 BOM", () => {
    const parsed = parseCsv({ originalname: "x.csv", buffer: Buffer.from("﻿name\nAhmed\n", "utf8") });
    expect(parsed.sheets[0]!.headers).toEqual(["name"]);
  });

  it("rejects unterminated quoted fields and empty files", () => {
    expect(() => parseCsv(csvFile('name\n"broken\n'))).toThrowError(/unterminated/i);
    expect(() => parseCsv(csvFile("   \n\n"))).toThrowError(/no data rows/i);
  });
});

describe("spreadsheet: upload dispatch and limits", () => {
  it("rejects unsupported extensions and empty uploads", async () => {
    const parse = (file: { originalname: string; buffer: Buffer; size: number }) => async () => parseSpreadsheetUpload(file);
    await expect(parse({ originalname: "x.txt", buffer: Buffer.from("a"), size: 1 })).rejects.toThrowError(/\.xlsx and \.csv/);
    await expect(parse({ originalname: "x.csv", buffer: Buffer.alloc(0), size: 0 })).rejects.toThrowError(/empty/i);
    await expect(
      parse({ originalname: "x.csv", buffer: Buffer.alloc(1), size: IMPORT_LIMITS.maxFileBytes + 1 })
    ).rejects.toThrowError(/maximum allowed size/i);
  });

  it("enforces the row limit on CSV", () => {
    const rows = Array.from({ length: IMPORT_LIMITS.maxRows + 2 }, (_, i) => `n${i},e${i}`).join("\n");
    expect(() => parseCsv(csvFile(`name,email\n${rows}\n`))).toThrowError(/exceeds/i);
  });
});

describe("spreadsheet: XLSX parsing", () => {
  async function makeXlsx(build: (sheet: ExcelJS.Worksheet) => void): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    build(workbook.addWorksheet("Data"));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  it("parses headers, rows, and ISO dates", async () => {
    const buffer = await makeXlsx((sheet) => {
      sheet.addRow(["Code", "Start"]);
      sheet.addRow(["P-01", new Date(Date.UTC(2025, 0, 15))]);
    });
    const parsed = await parseSpreadsheetUpload({ originalname: "projects.xlsx", buffer, size: buffer.length });
    expect(parsed.kind).toBe("xlsx");
    expect(parsed.sheets[0]!.headers).toEqual(["Code", "Start"]);
    expect(parsed.sheets[0]!.rows[0]!.cells.map((c) => c.text)).toEqual(["P-01", "2025-01-15"]);
  });

  it("flags formula cells without evaluating them", async () => {
    const buffer = await makeXlsx((sheet) => {
      sheet.addRow(["Code", "Total"]);
      sheet.getCell("A2").value = "P-01";
      sheet.getCell("B2").value = { formula: "1+1", result: 2 };
    });
    const parsed = await parseSpreadsheetUpload({ originalname: "f.xlsx", buffer, size: buffer.length });
    const cell = parsed.sheets[0]!.rows[0]!.cells[1]!;
    expect(cell.isFormula).toBe(true);
    expect(cell.text).toBe("");
  });

  it("rejects malformed buffers and empty workbooks", async () => {
    await expect(
      parseSpreadsheetUpload({ originalname: "bad.xlsx", buffer: Buffer.from("not a zip"), size: 9 })
    ).rejects.toThrowError(/not a readable/i);
    const empty = Buffer.from(await new ExcelJS.Workbook().xlsx.writeBuffer());
    await expect(parseSpreadsheetUpload({ originalname: "e.xlsx", buffer: empty, size: empty.length })).rejects.toThrowError();
  });
});

describe("spreadsheet: header mapping and row projection", () => {
  it("normalizes case, punctuation, and Arabic letter variants", () => {
    expect(normalizeHeader("  Client-Name ")).toBe("client name");
    expect(normalizeHeader("إسم_العميل")).toBe("اسم العميل");
    expect(normalizeHeader("الحالة")).toBe("الحاله");
  });

  it("auto-maps English and Arabic aliases and reports leftovers", () => {
    const { mapping, unmappedHeaders } = autoMapHeaders(
      ["اسم العميل", "E-Mail", "mystery"],
      CLIENT_FIELD_ALIASES
    );
    expect(mapping.name).toBe(0);
    expect(mapping.email).toBe(1);
    expect(mapping.phone).toBe(-1);
    expect(unmappedHeaders).toEqual(["mystery"]);
  });

  it("projects a row into a record and reports formula fields", () => {
    const row: ParsedRow = {
      index: 2,
      cells: [
        { text: "Ahmed", isFormula: false },
        { text: "", isFormula: true }
      ]
    };
    const { record, formulaFields } = rowToRecord(row, { name: 0, email: 1, phone: -1 });
    expect(record).toEqual({ name: "Ahmed", email: "", phone: "" });
    expect(formulaFields).toEqual(["email"]);
  });
});

describe("validation: shared helpers", () => {
  it("validates emails and phones", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(normalizePhone("+20 100 555 1234")).toBe("+20 100 555 1234");
    expect(normalizePhone("call me maybe")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("parses ISO and loose dates", () => {
    expect(parseImportDate("2025-03-01")?.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    expect(parseImportDate("March 2, 2025")?.getUTCFullYear()).toBe(2025);
    expect(parseImportDate("32/99/0000")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });

  it("parses bilingual boolean flags", () => {
    expect(parseBooleanFlag("yes")).toBe(true);
    expect(parseBooleanFlag("نشط")).toBe(true);
    expect(parseBooleanFlag("0")).toBe(false);
    expect(parseBooleanFlag("لا")).toBe(false);
    expect(parseBooleanFlag("maybe")).toBeNull();
  });

  it("collects first-seen keys for duplicate detection", () => {
    const seen = firstSeenKeys([
      { index: 2, key: "A" },
      { index: 3, key: "A" },
      { index: 4, key: "B" }
    ]);
    expect(seen.get("A")).toBe(2);
    expect(seen.get("B")).toBe(4);
  });
});

describe("validation: client rows", () => {
  const ctx = { existingUsers: new Map<string, string>(), existingClients: new Map<string, string>() };

  it("accepts a clean row", () => {
    const result = validateClientRow(2, { name: " Ahmed ", email: "A@B.COM", phone: "01005551234", notes: "", active: "yes" }, [], ctx, new Map());
    expect(result.status).toBe("valid");
    expect(result.data).toEqual({ name: "Ahmed", email: "a@b.com", phone: "01005551234", notes: null, isActive: true });
  });

  it("rejects missing name and malformed email", () => {
    const result = validateClientRow(2, { name: "", email: "nope" }, [], ctx, new Map());
    expect(result.status).toBe("error");
    expect(result.data).toBeNull();
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["required", "invalid_email"]));
  });

  it("marks existing accounts and in-file repeats as duplicates", () => {
    const withClient = { ...ctx, existingClients: new Map([["a@b.com", "cp1"]]) };
    const dup = validateClientRow(2, { name: "A", email: "a@b.com" }, [], withClient, new Map());
    expect(dup.status).toBe("duplicate");
    expect(dup.issues[0]!.code).toBe("existing_client");

    const inFile = validateClientRow(3, { name: "A", email: "a@b.com" }, [], ctx, new Map([["a@b.com", 2]]));
    expect(inFile.status).toBe("duplicate");
    expect(inFile.issues[0]!.code).toBe("duplicate_in_file");
  });

  it("keeps a real error as error even when the email is a duplicate", () => {
    const withClient = { ...ctx, existingClients: new Map([["a@b.com", "cp1"]]) };
    const result = validateClientRow(2, { name: "", email: "a@b.com" }, [], withClient, new Map());
    expect(result.status).toBe("error");
    expect(result.data).toBeNull();
  });

  it("flags formula cells as errors", () => {
    const result = validateClientRow(2, { name: "A", email: "a@b.com" }, ["email"], ctx, new Map());
    expect(result.status).toBe("error");
    expect(result.issues[0]!.code).toBe("formula");
  });
});

describe("validation: project rows", () => {
  const ctx = {
    existingCodes: new Map<string, string>(),
    clientsByEmail: new Map([["client@x.com", "cp1"]]),
    engineersByEmail: new Map([["eng@x.com", "u9"]])
  };
  const base = { code: "PRJ-1", name: "Tower", category: "CONSTRUCTION", clientEmail: "client@x.com", engineerEmail: "eng@x.com" };

  it("accepts a clean row with defaults", () => {
    const result = validateProjectRow(2, base, [], ctx, new Map());
    expect(result.status).toBe("valid");
    expect(result.data?.clientProfileId).toBe("cp1");
    expect(result.data?.engineerId).toBe("u9");
    expect(result.data?.phase).toBe("SITE_INSPECTION");
    expect(result.data?.status).toBe("PLANNED");
  });

  it("resolves Arabic enum values", () => {
    const result = validateProjectRow(2, { ...base, category: "تشطيبات", phase: "التنفيذ", status: "نشط" }, [], ctx, new Map());
    expect(result.status).toBe("valid");
    expect(result.data?.category).toBe("FINISHING");
    expect(result.data?.phase).toBe("EXECUTION");
    expect(result.data?.status).toBe("ACTIVE");
  });

  it("rejects unknown client and engineer emails", () => {
    const result = validateProjectRow(2, { ...base, clientEmail: "ghost@x.com", engineerEmail: "ghost@x.com" }, [], ctx, new Map());
    expect(result.status).toBe("error");
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["unknown_client", "unknown_engineer"]));
  });

  it("rejects reversed dates and out-of-range progress", () => {
    const result = validateProjectRow(
      2,
      { ...base, startDate: "2025-05-01", targetDate: "2025-01-01", progress: "120" },
      [],
      ctx,
      new Map()
    );
    expect(result.status).toBe("error");
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["date_order", "invalid_progress"]));
  });

  it("marks existing and in-file duplicate codes", () => {
    const withCode = { ...ctx, existingCodes: new Map([["PRJ-1", "p1"]]) };
    expect(validateProjectRow(2, base, [], withCode, new Map()).status).toBe("duplicate");
    expect(validateProjectRow(3, base, [], ctx, new Map([["PRJ-1", 2]])).status).toBe("duplicate");
  });
});

describe("validation: BOQ rows preserve exact arithmetic", () => {
  const ctx = { existingCodes: new Map<string, string>() };
  const base = { code: "B-1", description: "Concrete works", unit: "M3", quantity: "2.5", unitRate: "100.50" };

  it("computes line totals in integer minor units (no float drift)", () => {
    const result = validateBoqRow(2, base, [], ctx, new Map());
    expect(result.status).toBe("valid");
    expect(result.data?.quantityMilli).toBe(2500);
    expect(result.data?.unitRateMinor).toBe(10050);
    // 2.5 × 100.50 = 251.25 → 25125 minor units exactly.
    expect(result.data?.lineTotalMinor).toBe(25125);
    expect(previewLineTotal(result.data as BoqImportRow)).toBe("251.25");
  });

  it("resolves unit aliases in both languages", () => {
    expect(lookupBoqUnit("sqm")).toBe("M2");
    expect(lookupBoqUnit("متر")).toBe("M");
    expect(lookupBoqUnit("pcs")).toBe("ITEM");
    expect(lookupBoqUnit("furlong")).toBeNull();
  });

  it("rejects missing fields, bad units, and zero quantity", () => {
    const missing = validateBoqRow(2, { description: "", unit: "", quantity: "", unitRate: "" }, [], ctx, new Map());
    expect(missing.status).toBe("error");
    expect(missing.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["required", "invalid_enum"]));

    const zero = validateBoqRow(2, { ...base, quantity: "0" }, [], ctx, new Map());
    expect(zero.status).toBe("error");
    expect(zero.issues.some((i) => i.field === "quantity")).toBe(true);
  });

  it("rejects over-precision amounts that would corrupt arithmetic", () => {
    const result = validateBoqRow(2, { ...base, unitRate: "10.999" }, [], ctx, new Map());
    expect(result.status).toBe("error");
    expect(result.data).toBeNull();
  });

  it("marks duplicates in project and in file", () => {
    const withCode = { existingCodes: new Map([["B-1", "i1"]]) };
    expect(validateBoqRow(2, base, [], withCode, new Map()).status).toBe("duplicate");
    expect(validateBoqRow(3, base, [], ctx, new Map([["B-1", 2]])).status).toBe("duplicate");
  });
});

describe("exports: injection-safe serialization", () => {
  const dataset: ExportDataset = {
    name: "Clients",
    columns: [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "count", header: "Projects" }
    ],
    rows: [
      { name: "=cmd|'/c calc'!A1", email: "a@b.com", count: 3 },
      { name: "  +SUM(1)", email: "quoted,\"v\"", count: 0 },
      { name: "Normal", email: "n@b.com", count: 7 }
    ]
  };

  it("prefixes executable-leading strings and leaves numbers numeric", () => {
    expect(sanitizeCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCell("  -5")).toBe("'  -5");
    expect(sanitizeCell("plain")).toBe("plain");
    expect(sanitizeCell("")).toBe("");

    const csv = buildCsv(dataset).toString("utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toBe("'=cmd|'/c calc'!A1,a@b.com,3");
    expect(lines[2]).toBe("'  +SUM(1),\"quoted,\"\"v\"\"\",0");
    expect(lines[3]).toBe("Normal,n@b.com,7");
  });

  it("round-trips through xlsx with sanitized strings and numeric cells", async () => {
    const buffer = await buildXlsx(dataset);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0]!;
    expect(sheet.getCell("A1").text).toBe("Name");
    expect(sheet.getCell("A2").text).toBe("'=cmd|'/c calc'!A1");
    expect(sheet.getCell("C2").value).toBe(3);
    expect(sheet.getCell("A4").text).toBe("Normal");
  });

  it("generates dated filenames", () => {
    expect(exportFilename("clients", "csv")).toMatch(/^elhabak-clients-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
