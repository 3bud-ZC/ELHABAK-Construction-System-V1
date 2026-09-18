import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { SiteUpdateType } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { AuditService } from "../admin/audit.service";
import { AuthService } from "../auth/auth.service";
import { NotificationService } from "../notifications/notification.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { StorageService } from "../projects/storage.service";
import { buildCsv, buildXlsx, exportFilename, type ExportDataset } from "./export-builders";
import {
  autoMapHeaders,
  parseSpreadsheetUpload,
  rowToRecord,
  type ParsedSheet,
  type ParsedWorkbook
} from "./spreadsheet";
import {
  BOQ_FIELD_ALIASES,
  CLIENT_FIELD_ALIASES,
  DUPLICATE_STRATEGIES,
  PROJECT_FIELD_ALIASES,
  firstSeenKeys,
  normalizeEmailValue,
  previewLineTotal,
  validateBoqRow,
  validateClientRow,
  validateProjectRow,
  type BoqImportContext,
  type ClientImportContext,
  type DuplicateStrategy,
  type FieldIssue,
  type ProjectImportContext,
  type RowStatus
} from "./import-validation";

export type ImportType = "clients" | "projects" | "boq";

export type ImportOptions = {
  sheet?: string | undefined;
  mapping?: Record<string, number> | undefined;
  strategy?: DuplicateStrategy | undefined;
  projectId?: string | undefined;
};

export type ImportRowResult = {
  index: number;
  status: RowStatus;
  issues: FieldIssue[];
  data: Record<string, unknown> | null;
};

export type ImportPreview = {
  fileName: string;
  kind: "xlsx" | "csv";
  sheets: string[];
  sheet: string;
  headers: string[];
  mapping: Record<string, number>;
  unmappedHeaders: string[];
  rows: ImportRowResult[];
  summary: {
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
    missingFields: string[];
  };
};

export type ImportCommitResult = {
  ok: boolean;
  type: ImportType;
  fileName: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: Array<{ index: number; message: string }>;
};

const SITE_UPDATE_TYPES: SiteUpdateType[] = ["PROGRESS", "INSPECTION", "ISSUE", "MATERIAL", "GENERAL"];

const MEDIA_MANIFEST_ALIASES: Record<string, string[]> = {
  filename: ["filename", "file", "file name", "اسم الملف", "الملف"],
  type: ["type", "update type", "النوع", "نوع التحديث"],
  note: ["note", "notes", "ملاحظه", "ملاحظات"],
  clientVisible: ["client_visible", "client visible", "visible", "ظاهر للعميل", "العميل"],
  date: ["date", "created", "التاريخ", "تاريخ"]
};

const MEDIA_TYPE_ALIASES: Record<string, SiteUpdateType> = {
  progress: "PROGRESS",
  inspection: "INSPECTION",
  issue: "ISSUE",
  material: "MATERIAL",
  general: "GENERAL",
  "تقدم": "PROGRESS",
  "انجاز": "PROGRESS",
  "معاينه": "INSPECTION",
  "مشكله": "ISSUE",
  "مواد": "MATERIAL",
  "عام": "GENERAL"
};

const MEDIA_BATCH_MAX_FILES = 30;

@Injectable()
export class DataOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly storage: StorageService,
    private readonly access: ProjectAccessService,
    private readonly notifications: NotificationService
  ) {}

  /* ------------------------------ import preview ------------------------------ */

  async previewImport(user: RequestUser, type: ImportType, file: Express.Multer.File, options: ImportOptions): Promise<ImportPreview> {
    this.assertImportRole(user, type);
    const workbook = await parseSpreadsheetUpload(file);
    const sheet = this.pickSheet(workbook, options.sheet);
    const aliases = aliasesFor(type);
    const auto = autoMapHeaders(sheet.headers, aliases);
    const mapping = { ...auto.mapping, ...(options.mapping ?? {}) };

    const required = requiredFieldsFor(type);
    const missingFields = required.filter((field) => (mapping[field] ?? -1) < 0);

    const ctx = await this.buildContext(type, options.projectId);
    const seen = this.seenKeys(type, sheet, mapping);
    const rows = sheet.rows.map((row) => {
      const { record, formulaFields } = rowToRecord(row, mapping);
      const result = validateRowFor(type, row.index, record, formulaFields, ctx, seen);
      return {
        index: row.index,
        status: result.status,
        issues: result.issues,
        data: result.data ? (result.data) : null
      };
    });

    return {
      fileName: workbook.fileName,
      kind: workbook.kind,
      sheets: workbook.sheets.map((item) => item.name),
      sheet: sheet.name,
      headers: sheet.headers,
      mapping,
      unmappedHeaders: auto.unmappedHeaders,
      rows,
      summary: {
        total: rows.length,
        valid: rows.filter((row) => row.status === "valid").length,
        duplicates: rows.filter((row) => row.status === "duplicate").length,
        errors: rows.filter((row) => row.status === "error").length,
        missingFields
      }
    };
  }

  /* ------------------------------- import commit ------------------------------ */

  async commitImport(user: RequestUser, type: ImportType, file: Express.Multer.File, options: ImportOptions): Promise<ImportCommitResult> {
    this.assertImportRole(user, type);
    const preview = await this.previewImport(user, type, file, options);
    const strategy = options.strategy ?? "error";

    if (preview.summary.missingFields.length > 0) {
      throw new BadRequestException("Required columns are not mapped. Complete the column mapping before committing.");
    }

    const errorRows = preview.rows.filter((row) => row.status === "error");
    if (errorRows.length > 0) {
      throw new BadRequestException(
        `Import has ${errorRows.length} invalid row(s). Fix the file or remove those rows before committing.`
      );
    }

    const duplicateRows = preview.rows.filter((row) => row.status === "duplicate");
    if (duplicateRows.length > 0 && strategy === "error") {
      throw new ConflictException(
        `Import contains ${duplicateRows.length} duplicate record(s). Choose a duplicate strategy (skip or update) to proceed.`
      );
    }

    const workbook = await parseSpreadsheetUpload(file);
    const sheet = this.pickSheet(workbook, options.sheet);
    const mapping = preview.mapping;
    const ctx = await this.buildContext(type, options.projectId);
    const seen = this.seenKeys(type, sheet, mapping);

    if (type === "clients") {
      return this.commitClients(user, preview, sheet, mapping, ctx as ClientImportContext, seen, strategy);
    }
    if (type === "projects") {
      return this.commitProjects(user, preview, sheet, mapping, ctx as ProjectImportContext, seen, strategy);
    }
    return this.commitBoq(user, preview, sheet, mapping, ctx as BoqImportContext, seen, strategy, options.projectId!);
  }

  private async commitClients(
    user: RequestUser,
    preview: ImportPreview,
    sheet: ParsedSheet,
    mapping: Record<string, number>,
    ctx: ClientImportContext,
    seen: Map<string, number>,
    strategy: DuplicateStrategy
  ): Promise<ImportCommitResult> {
    const rows = sheet.rows.map((row) => {
      const { record, formulaFields } = rowToRecord(row, mapping);
      return validateClientRow(row.index, record, formulaFields, ctx, seen);
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failures: Array<{ index: number; message: string }> = [];

    // Hash a fresh random password for each new account before entering the transaction;
    // bcrypt is deliberately slow and must not run inside the DB transaction window.
    const passwordHashes = new Map<number, string>();
    for (const row of rows) {
      if (row.status === "valid" && row.data) {
        const temporary = randomBytes(12).toString("base64url");
        passwordHashes.set(row.index, await this.auth.hashPassword(temporary));
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = row.data;
          if (!data) {
            skipped += 1;
            continue;
          }
          if (row.status === "duplicate") {
            if (strategy === "skip") {
              skipped += 1;
              continue;
            }
            if (strategy === "update") {
              const clientId = ctx.existingClients.get(data.email);
              if (!clientId) {
                failures.push({ index: row.index, message: "Email belongs to a non-client account; cannot update." });
                continue;
              }
              await tx.clientProfile.update({
                where: { id: clientId },
                data: {
                  phone: data.phone,
                  notes: data.notes,
                  user: { update: { displayName: data.name, isActive: data.isActive } }
                }
              });
              updated += 1;
              continue;
            }
            skipped += 1;
            continue;
          }
          await tx.clientProfile.create({
            data: {
              phone: data.phone,
              notes: data.notes,
              user: {
                create: {
                  email: data.email,
                  displayName: data.name,
                  role: "CLIENT",
                  isActive: data.isActive,
                  passwordHash: passwordHashes.get(row.index)!
                }
              }
            }
          });
          created += 1;
        }
      });
    } catch (error) {
      await this.audit.record(user, "data_import.clients_failed", {
        fileName: preview.fileName,
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown"
      });
      throw new ConflictException("Client import failed; no records were written.");
    }

    await this.audit.record(user, "data_import.clients", {
      fileName: preview.fileName,
      total: rows.length,
      created,
      updated,
      skipped,
      failed: failures.length
    });

    return {
      ok: failures.length === 0,
      type: "clients",
      fileName: preview.fileName,
      created,
      updated,
      skipped,
      failed: failures.length,
      failures
    };
  }

  private async commitProjects(
    user: RequestUser,
    preview: ImportPreview,
    sheet: ParsedSheet,
    mapping: Record<string, number>,
    ctx: ProjectImportContext,
    seen: Map<string, number>,
    strategy: DuplicateStrategy
  ): Promise<ImportCommitResult> {
    const rows = sheet.rows.map((row) => {
      const { record, formulaFields } = rowToRecord(row, mapping);
      return validateProjectRow(row.index, record, formulaFields, ctx, seen);
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failures: Array<{ index: number; message: string }> = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = row.data;
          if (!data) {
            skipped += 1;
            continue;
          }
          if (row.status === "duplicate") {
            if (strategy === "skip") {
              skipped += 1;
              continue;
            }
            if (strategy === "update") {
              const existingId = ctx.existingCodes.get(data.code);
              if (!existingId) {
                failures.push({ index: row.index, message: "Duplicate code could not be resolved for update." });
                continue;
              }
              await tx.project.update({
                where: { id: existingId },
                data: {
                  name: data.name,
                  category: data.category,
                  client: { connect: { id: data.clientProfileId } },
                  engineer: { connect: { id: data.engineerId } },
                  location: data.location,
                  startDate: data.startDate,
                  targetDate: data.targetDate,
                  phase: data.phase,
                  progress: data.progress,
                  status: data.status,
                  notes: data.notes
                }
              });
              updated += 1;
              continue;
            }
            skipped += 1;
            continue;
          }
          await tx.project.create({
            data: {
              code: data.code,
              name: data.name,
              category: data.category,
              client: { connect: { id: data.clientProfileId } },
              engineer: { connect: { id: data.engineerId } },
              location: data.location,
              startDate: data.startDate,
              targetDate: data.targetDate,
              phase: data.phase,
              progress: data.progress,
              status: data.status,
              notes: data.notes
            }
          });
          created += 1;
        }
      });
    } catch (error) {
      await this.audit.record(user, "data_import.projects_failed", {
        fileName: preview.fileName,
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown"
      });
      throw new ConflictException("Project import failed; no records were written.");
    }

    await this.audit.record(user, "data_import.projects", {
      fileName: preview.fileName,
      total: rows.length,
      created,
      updated,
      skipped,
      failed: failures.length
    });

    return {
      ok: failures.length === 0,
      type: "projects",
      fileName: preview.fileName,
      created,
      updated,
      skipped,
      failed: failures.length,
      failures
    };
  }

  private async commitBoq(
    user: RequestUser,
    preview: ImportPreview,
    sheet: ParsedSheet,
    mapping: Record<string, number>,
    ctx: BoqImportContext,
    seen: Map<string, number>,
    strategy: DuplicateStrategy,
    projectId: string
  ): Promise<ImportCommitResult> {
    const rows = sheet.rows.map((row) => {
      const { record, formulaFields } = rowToRecord(row, mapping);
      return validateBoqRow(row.index, record, formulaFields, ctx, seen);
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failures: Array<{ index: number; message: string }> = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const data = row.data;
          if (!data) {
            skipped += 1;
            continue;
          }
          if (row.status === "duplicate") {
            if (strategy === "skip") {
              skipped += 1;
              continue;
            }
            if (strategy === "update") {
              const existingId = ctx.existingCodes.get(data.code);
              if (!existingId) {
                failures.push({ index: row.index, message: "Duplicate code could not be resolved for update." });
                continue;
              }
              await tx.bOQItem.update({
                where: { id: existingId },
                data: {
                  section: data.section,
                  description: data.description,
                  unit: data.unit,
                  quantityMilli: data.quantityMilli,
                  unitRateMinor: data.unitRateMinor,
                  lineTotalMinor: data.lineTotalMinor,
                  note: data.note,
                  sortOrder: data.sortOrder
                }
              });
              updated += 1;
              continue;
            }
            skipped += 1;
            continue;
          }
          await tx.bOQItem.create({
            data: {
              projectId,
              code: data.code,
              section: data.section,
              description: data.description,
              unit: data.unit,
              quantityMilli: data.quantityMilli,
              unitRateMinor: data.unitRateMinor,
              lineTotalMinor: data.lineTotalMinor,
              note: data.note,
              sortOrder: data.sortOrder,
              createdById: user.id
            }
          });
          created += 1;
        }
      });
    } catch (error) {
      await this.audit.record(user, "data_import.boq_failed", {
        fileName: preview.fileName,
        projectId,
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown"
      });
      throw new ConflictException("BOQ import failed; no records were written.");
    }

    await this.audit.record(
      user,
      "data_import.boq",
      {
        fileName: preview.fileName,
        total: rows.length,
        created,
        updated,
        skipped,
        failed: failures.length
      },
      projectId
    );

    return {
      ok: failures.length === 0,
      type: "boq",
      fileName: preview.fileName,
      created,
      updated,
      skipped,
      failed: failures.length,
      failures
    };
  }

  /* ------------------------------- media batch -------------------------------- */

  /**
   * Batch field-media import: multiple images/videos are validated by the existing
   * StorageService rules, then attached to one SiteUpdate per distinct
   * (type, visibility, note) metadata group. Files written before a failed DB
   * transaction are removed again, so a failed import never orphans storage.
   */
  async mediaBatch(
    user: RequestUser,
    projectId: string,
    fields: { type?: string | undefined; isClientVisible?: string | undefined; note?: string | undefined; strictManifest?: string | undefined },
    files: Express.Multer.File[],
    manifestFile?: Express.Multer.File
  ) {
    if (user.role !== "ADMIN" && user.role !== "ENGINEER") {
      throw new ForbiddenException("Batch media import is limited to administrators and assigned engineers.");
    }
    await this.access.assertCanSubmitSiteUpdate(user, projectId);

    if (!files || files.length === 0) {
      throw new BadRequestException("At least one media file is required.");
    }
    if (files.length > MEDIA_BATCH_MAX_FILES) {
      throw new BadRequestException(`A batch may contain at most ${MEDIA_BATCH_MAX_FILES} media files.`);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true, phase: true, progress: true }
    });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }

    const sharedType = parseSiteUpdateType(fields.type) ?? "GENERAL";
    const sharedVisible = fields.isClientVisible !== "false";
    const sharedNote = (fields.note ?? "").trim() || null;
    const strict = fields.strictManifest === "true";

    // Manifest: optional spreadsheet mapping filename -> per-file metadata overrides.
    const manifest = new Map<string, { type: SiteUpdateType | null; note: string | null; clientVisible: boolean | null; date: Date | null }>();
    if (manifestFile) {
      const parsed = await parseSpreadsheetUpload(manifestFile);
      const sheet = parsed.sheets.find((item) => item.rows.length > 0) ?? parsed.sheets[0]!;
      const { mapping } = autoMapHeaders(sheet.headers, MEDIA_MANIFEST_ALIASES);
      if ((mapping.filename ?? -1) < 0) {
        throw new BadRequestException("The manifest must include a filename column.");
      }
      for (const row of sheet.rows) {
        const { record } = rowToRecord(row, mapping);
        const filename = (record.filename ?? "").trim();
        if (!filename) continue;
        const type = record.type ? parseSiteUpdateType(record.type) : null;
        if (record.type && !type) {
          throw new BadRequestException(`Manifest row ${row.index}: unknown update type "${record.type}".`);
        }
        const visible = record.clientVisible ? parseManifestFlag(record.clientVisible) : null;
        const date = record.date ? parseManifestDate(record.date) : null;
        if (record.date && !date) {
          throw new BadRequestException(`Manifest row ${row.index}: invalid date "${record.date}".`);
        }
        manifest.set(filename, {
          type,
          note: (record.note ?? "").trim() || null,
          clientVisible: visible,
          date
        });
      }
      for (const name of manifest.keys()) {
        if (!files.some((file) => baseName(file.originalname) === name)) {
          throw new BadRequestException(`Manifest references "${name}" but no matching file was uploaded.`);
        }
      }
      if (strict) {
        const unreferenced = files.filter((file) => !manifest.has(baseName(file.originalname)));
        if (unreferenced.length > 0) {
          throw new BadRequestException(
            `Strict manifest mode: ${unreferenced.length} uploaded file(s) are not referenced by the manifest.`
          );
        }
      }
    }

    // Group files by their effective metadata so each group becomes one SiteUpdate.
    const groups = new Map<string, { type: SiteUpdateType; isClientVisible: boolean; note: string | null; date: Date | null; files: Express.Multer.File[] }>();
    for (const file of files) {
      const override = manifest.get(baseName(file.originalname));
      const type = override?.type ?? sharedType;
      const isClientVisible = override?.clientVisible ?? sharedVisible;
      const note = override?.note ?? sharedNote;
      const date = override?.date ?? null;
      const key = `${type}|${isClientVisible}|${note ?? ""}|${date?.toISOString() ?? ""}`;
      const group = groups.get(key) ?? { type, isClientVisible, note, date, files: [] };
      group.files.push(file);
      groups.set(key, group);
    }

    // Store every file first (validating type/size/signature), then persist; on failure
    // every file written during this request is removed again.
    const storedPaths: string[] = [];
    try {
      const stored = [] as Array<{ file: Express.Multer.File; stored: Awaited<ReturnType<StorageService["store"]>> }>;
      for (const group of groups.values()) {
        for (const file of group.files) {
          this.assertMediaSignature(file);
          const storedFile = await this.storage.store(projectId, file);
          storedPaths.push(storedFile.storagePath);
          stored.push({ file, stored: storedFile });
        }
      }

      const groupList = [...groups.values()];
      const updateIds: string[] = [];
      await this.prisma.$transaction(async (tx) => {
        let cursor = 0;
        for (const group of groupList) {
          const groupStored = stored.slice(cursor, cursor + group.files.length);
          cursor += group.files.length;
          const update = await tx.siteUpdate.create({
            data: {
              projectId,
              authorId: user.id,
              type: group.type,
              phase: project.phase,
              isClientVisible: group.isClientVisible,
              note: group.note,
              ...(group.date ? { createdAt: group.date } : {}),
              media: {
                create: groupStored.map(({ file, stored: item }) => ({
                  projectId,
                  uploaderId: user.id,
                  mediaType: item.mediaType,
                  storagePath: item.storagePath,
                  storedFilename: item.storedFilename,
                  originalFilename: file.originalname,
                  mimeType: file.mimetype,
                  fileSize: file.size
                }))
              }
            }
          });
          updateIds.push(update.id);
        }
      });

      await this.audit.record(
        user,
        "data_import.media",
        {
          fileName: manifestFile?.originalname ?? null,
          mediaCount: files.length,
          updateCount: updateIds.length
        },
        projectId
      );

      if (groups.size === 1 && sharedVisible) {
        const { adminIds, clientUserId } = await this.notifications.getProjectParticipants(projectId);
        await this.notifications.notify([...adminIds, ...(clientUserId ? [clientUserId] : [])], {
          type: "SITE_UPDATE",
          title: `${user.displayName}: ${files.length} media files imported`,
          projectId,
          entityId: updateIds[0] ?? null,
          actorId: user.id
        });
      }

      return { ok: true, imported: files.length, updates: updateIds.length };
    } catch (error) {
      await Promise.all(storedPaths.map((path) => this.storage.remove(path)));
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException("Batch media import failed; uploaded files were rolled back.");
    }
  }

  /* --------------------------------- exports ---------------------------------- */

  async exportDataset(
    user: RequestUser,
    dataset: string,
    format: "xlsx" | "csv",
    query: { projectId?: string | undefined }
  ): Promise<{ filename: string; contentType: string; body: Buffer }> {
    const data = await this.dataset(user, dataset, query);
    const body = format === "csv" ? buildCsv(data) : await buildXlsx(data);
    return {
      filename: exportFilename(dataset, format),
      contentType:
        format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body
    };
  }

  private async dataset(user: RequestUser, dataset: string, query: { projectId?: string | undefined }): Promise<ExportDataset> {
    switch (dataset) {
      case "projects": {
        this.assertAdmin(user);
        const projects = await this.prisma.project.findMany({
          include: {
            client: { include: { user: { select: { displayName: true, email: true } } } },
            engineer: { select: { displayName: true, email: true } }
          },
          orderBy: { updatedAt: "desc" }
        });
        return {
          name: "Projects",
          columns: [
            { key: "code", header: "Code" },
            { key: "name", header: "Name" },
            { key: "category", header: "Category" },
            { key: "client", header: "Client" },
            { key: "engineer", header: "Engineer" },
            { key: "location", header: "Location" },
            { key: "phase", header: "Phase" },
            { key: "status", header: "Status" },
            { key: "progress", header: "Progress %" },
            { key: "startDate", header: "Start Date" },
            { key: "targetDate", header: "Target Date" }
          ],
          rows: projects.map((project) => ({
            code: project.code,
            name: project.name,
            category: project.category,
            client: project.client?.user.displayName ?? null,
            engineer: project.engineer?.displayName ?? null,
            location: project.location,
            phase: project.phase,
            status: project.status,
            progress: project.progress,
            startDate: project.startDate?.toISOString().slice(0, 10) ?? null,
            targetDate: project.targetDate?.toISOString().slice(0, 10) ?? null
          }))
        };
      }
      case "clients": {
        this.assertAdmin(user);
        const clients = await this.prisma.clientProfile.findMany({
          include: {
            user: { select: { displayName: true, email: true, isActive: true } },
            _count: { select: { projects: true } }
          },
          orderBy: { createdAt: "desc" }
        });
        return {
          name: "Clients",
          columns: [
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
            { key: "active", header: "Active" },
            { key: "projects", header: "Projects" },
            { key: "notes", header: "Notes" }
          ],
          rows: clients.map((client) => ({
            name: client.user.displayName,
            email: client.user.email,
            phone: client.phone,
            active: client.user.isActive ? "yes" : "no",
            projects: client._count.projects,
            notes: client.notes
          }))
        };
      }
      case "users": {
        this.assertAdmin(user);
        const users = await this.prisma.user.findMany({
          select: {
            displayName: true,
            email: true,
            role: true,
            isActive: true,
            archivedAt: true,
            createdAt: true,
            clientProfile: { select: { phone: true, _count: { select: { projects: true } } } }
          },
          orderBy: { createdAt: "desc" }
        });
        return {
          name: "Users",
          columns: [
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
            { key: "role", header: "Role" },
            { key: "status", header: "Status" },
            { key: "projects", header: "Projects" },
            { key: "created", header: "Created" }
          ],
          rows: users.map((record) => ({
            name: record.displayName,
            email: record.email,
            phone: record.clientProfile?.phone ?? null,
            role: record.role,
            status: record.archivedAt ? "archived" : record.isActive ? "active" : "suspended",
            projects: record.clientProfile?._count.projects ?? null,
            created: record.createdAt.toISOString().slice(0, 10)
          }))
        };
      }
      case "boq": {
        const projectId = requiredProjectId(query);
        await this.assertBoqRead(user, projectId);
        const items = await this.prisma.bOQItem.findMany({
          where: { projectId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        });
        return {
          name: "BOQ",
          columns: [
            { key: "code", header: "Code" },
            { key: "section", header: "Section" },
            { key: "description", header: "Description" },
            { key: "unit", header: "Unit" },
            { key: "quantity", header: "Quantity" },
            { key: "unitRate", header: "Unit Rate" },
            { key: "lineTotal", header: "Line Total" },
            { key: "note", header: "Note" },
            { key: "sortOrder", header: "Sort Order" }
          ],
          rows: items.map((item) => ({
            code: item.code,
            section: item.section,
            description: item.description,
            unit: item.unit,
            quantity: minorUnits(item.quantityMilli, 3),
            unitRate: minorUnits(item.unitRateMinor, 2),
            lineTotal: minorUnits(item.lineTotalMinor, 2),
            note: item.note,
            sortOrder: item.sortOrder
          }))
        };
      }
      case "payments": {
        const projectId = requiredProjectId(query);
        if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
          throw new ForbiddenException("Payment export is limited to administrators and accountants.");
        }
        const [clientPayments, contractorPayments] = await Promise.all([
          this.prisma.clientPayment.findMany({ where: { projectId }, orderBy: { paymentDate: "desc" } }),
          this.prisma.contractorPayment.findMany({ where: { projectId }, orderBy: { paymentDate: "desc" } })
        ]);
        const rows = [
          ...clientPayments.map((payment) => ({
            kind: "CLIENT",
            date: payment.paymentDate.toISOString().slice(0, 10),
            payee: null as string | null,
            amount: minorUnits(payment.amountMinor, 2),
            currency: payment.currency,
            method: payment.method,
            reference: payment.reference,
            description: payment.description,
            status: payment.status
          })),
          ...contractorPayments.map((payment) => ({
            kind: "CONTRACTOR",
            date: payment.paymentDate.toISOString().slice(0, 10),
            payee: payment.payee,
            amount: minorUnits(payment.amountMinor, 2),
            currency: payment.currency,
            method: payment.method,
            reference: payment.reference,
            description: payment.description,
            status: payment.status
          }))
        ];
        return {
          name: "Payments",
          columns: [
            { key: "kind", header: "Kind" },
            { key: "date", header: "Date" },
            { key: "payee", header: "Payee" },
            { key: "amount", header: "Amount" },
            { key: "currency", header: "Currency" },
            { key: "method", header: "Method" },
            { key: "reference", header: "Reference" },
            { key: "description", header: "Description" },
            { key: "status", header: "Status" }
          ],
          rows
        };
      }
      case "documents": {
        const projectId = requiredProjectId(query);
        if (!(["ADMIN", "ENGINEER", "CLIENT"] as const).includes(user.role as "ADMIN" | "ENGINEER" | "CLIENT")) {
          throw new ForbiddenException("Document export access denied.");
        }
        await this.access.assertCanRead(user, projectId);
        const isClient = user.role === "CLIENT";
        const documents = await this.prisma.projectDocument.findMany({
          where: { projectId, ...(isClient ? { isClientVisible: true, status: "ACTIVE" } : {}) },
          orderBy: { updatedAt: "desc" }
        });
        return {
          name: "Documents",
          columns: [
            { key: "reference", header: "Reference" },
            { key: "title", header: "Title" },
            { key: "category", header: "Category" },
            { key: "status", header: "Status" },
            { key: "visibility", header: "Visibility" },
            { key: "version", header: "Version" },
            { key: "updated", header: "Updated" }
          ],
          rows: documents.map((document) => ({
            reference: document.reference,
            title: document.title,
            category: document.category,
            status: document.status,
            visibility: document.isClientVisible ? "client-shared" : "internal",
            version: document.currentVersionNumber,
            updated: document.updatedAt.toISOString().slice(0, 10)
          }))
        };
      }
      case "designs": {
        const projectId = requiredProjectId(query);
        if (!(["ADMIN", "ENGINEER", "CLIENT"] as const).includes(user.role as "ADMIN" | "ENGINEER" | "CLIENT")) {
          throw new ForbiddenException("Design export access denied.");
        }
        await this.access.assertCanRead(user, projectId);
        const designs = await this.prisma.designItem.findMany({
          where: { projectId },
          include: {
            revisions: { orderBy: { revisionNumber: "desc" }, take: 1, include: { uploader: { select: { displayName: true } } } }
          },
          orderBy: { updatedAt: "desc" }
        });
        return {
          name: "Designs",
          columns: [
            { key: "title", header: "Title" },
            { key: "discipline", header: "Discipline" },
            { key: "status", header: "Status" },
            { key: "revision", header: "Current Revision" },
            { key: "filename", header: "File" },
            { key: "uploader", header: "Uploader" },
            { key: "updated", header: "Updated" }
          ],
          rows: designs.map((design) => ({
            title: design.title,
            discipline: design.discipline,
            status: design.status,
            revision: design.currentRevisionNumber,
            filename: design.revisions[0]?.originalFilename ?? null,
            uploader: design.revisions[0]?.uploader.displayName ?? null,
            updated: design.updatedAt.toISOString().slice(0, 10)
          }))
        };
      }
      default:
        throw new NotFoundException("Unknown export dataset.");
    }
  }

  /* --------------------------------- templates -------------------------------- */

  async template(type: ImportType): Promise<{ filename: string; body: Buffer }> {
    const datasets: Record<ImportType, ExportDataset> = {
      clients: {
        name: "clients-template",
        columns: [
          { key: "name", header: "name" },
          { key: "email", header: "email" },
          { key: "phone", header: "phone" },
          { key: "notes", header: "notes" },
          { key: "active", header: "active" }
        ],
        rows: [
          { name: "Ahmed Example", email: "client@example.com", phone: "+20 100 000 0000", notes: "Example row - delete before import", active: "yes" }
        ]
      },
      projects: {
        name: "projects-template",
        columns: [
          { key: "code", header: "project_code" },
          { key: "name", header: "name" },
          { key: "category", header: "category" },
          { key: "clientEmail", header: "client_email" },
          { key: "engineerEmail", header: "engineer_email" },
          { key: "location", header: "location" },
          { key: "startDate", header: "start_date" },
          { key: "targetDate", header: "target_date" },
          { key: "phase", header: "phase" },
          { key: "progress", header: "progress" },
          { key: "status", header: "status" },
          { key: "notes", header: "notes" }
        ],
        rows: [
          {
            code: "PRJ-EX-01",
            name: "Example Project",
            category: "CONSTRUCTION",
            clientEmail: "client@example.com",
            engineerEmail: "engineer@example.com",
            location: "Sohag",
            startDate: "2026-01-01",
            targetDate: "2026-12-31",
            phase: "SITE_INSPECTION",
            progress: 0,
            status: "PLANNED",
            notes: "Example row - delete before import"
          }
        ]
      },
      boq: {
        name: "boq-template",
        columns: [
          { key: "code", header: "code" },
          { key: "section", header: "section" },
          { key: "description", header: "description" },
          { key: "unit", header: "unit" },
          { key: "quantity", header: "quantity" },
          { key: "unitRate", header: "unit_rate" },
          { key: "note", header: "note" },
          { key: "sortOrder", header: "sort_order" }
        ],
        rows: [
          {
            code: "BOQ-001",
            section: "Earthworks",
            description: "Example row - excavation works",
            unit: "M3",
            quantity: "12.500",
            unitRate: "350.00",
            note: "Example row - delete before import",
            sortOrder: 1
          }
        ]
      }
    };
    const body = await buildXlsx(datasets[type]);
    return { filename: `elhabak-${type}-import-template.xlsx`, body };
  }

  /* ---------------------------------- jobs ------------------------------------ */

  async listJobs(user: RequestUser) {
    if (user.role === "CLIENT" || user.role === "WORKER") {
      throw new ForbiddenException("Import history access denied.");
    }
    const rows = await this.prisma.auditLog.findMany({
      where: { action: { startsWith: "data_import." } },
      include: {
        actor: { select: { id: true, displayName: true, role: true } },
        project: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 25
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      actor: row.actor ? { id: row.actor.id, displayName: row.actor.displayName, role: row.actor.role } : null,
      project: row.project ? { id: row.project.id, name: row.project.name, code: row.project.code } : null,
      createdAt: row.createdAt.toISOString()
    }));
  }

  /** Lightweight capability summary for the Data Operations landing surface. */
  async overview(user: RequestUser) {
    const canImportClients = user.role === "ADMIN";
    const canImportProjects = user.role === "ADMIN";
    const canImportBoq = user.role === "ADMIN" || user.role === "ACCOUNTANT";
    const canImportMedia = user.role === "ADMIN" || user.role === "ENGINEER";

    const projects = canImportBoq || canImportMedia
      ? await this.prisma.project.findMany({
          where: user.role === "ADMIN" || user.role === "ACCOUNTANT" ? {} : this.access.projectWhereFor(user),
          select: { id: true, code: true, name: true, status: true },
          orderBy: { updatedAt: "desc" },
          take: 100
        })
      : [];

    return {
      capabilities: {
        clients: canImportClients,
        projects: canImportProjects,
        boq: canImportBoq,
        media: canImportMedia,
        exports: user.role !== "CLIENT" && user.role !== "WORKER"
      },
      projects: projects.map((project) => ({
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status
      }))
    };
  }

  /* --------------------------------- internals -------------------------------- */

  private assertImportRole(user: RequestUser, type: ImportType) {
    if (type === "clients" || type === "projects") {
      this.assertAdmin(user);
      return;
    }
    if (type === "boq") {
      if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
        throw new ForbiddenException("BOQ import is limited to administrators and accountants.");
      }
      return;
    }
    throw new NotFoundException("Unknown import type.");
  }

  private assertAdmin(user: RequestUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Administrator access required.");
    }
  }

  private async assertBoqRead(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      const exists = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!exists) throw new NotFoundException("Project not found.");
      return;
    }
    if (user.role === "ENGINEER") {
      await this.access.assertCanRead(user, projectId);
      return;
    }
    throw new ForbiddenException("BOQ export access denied.");
  }

  private pickSheet(workbook: ParsedWorkbook, requested?: string): ParsedSheet {
    if (requested) {
      const found = workbook.sheets.find((sheet) => sheet.name === requested);
      if (!found) {
        throw new BadRequestException(`Sheet "${requested}" was not found in the uploaded file.`);
      }
      return found;
    }
    const first = workbook.sheets.find((sheet) => sheet.rows.length > 0) ?? workbook.sheets[0]!;
    return first;
  }

  private async buildContext(type: ImportType, projectId?: string): Promise<ClientImportContext | ProjectImportContext | BoqImportContext> {
    if (type === "clients") {
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, clientProfile: { select: { id: true } } }
      });
      return {
        existingUsers: new Map(users.map((item) => [item.email, item.id])),
        existingClients: new Map(
          users.filter((item) => item.clientProfile).map((item) => [item.email, item.clientProfile!.id])
        )
      };
    }
    if (type === "projects") {
      const [projects, clients, engineers] = await Promise.all([
        this.prisma.project.findMany({ where: { code: { not: null } }, select: { id: true, code: true } }),
        this.prisma.clientProfile.findMany({ include: { user: { select: { email: true } } } }),
        this.prisma.user.findMany({ where: { role: "ENGINEER" }, select: { id: true, email: true } })
      ]);
      return {
        existingCodes: new Map(projects.map((project) => [project.code!.toUpperCase(), project.id])),
        clientsByEmail: new Map(clients.map((client) => [client.user.email, client.id])),
        engineersByEmail: new Map(engineers.map((engineer) => [engineer.email, engineer.id]))
      };
    }
    const targetProjectId = projectId;
    if (!targetProjectId) {
      throw new BadRequestException("A target project is required for BOQ imports.");
    }
    const project = await this.prisma.project.findUnique({ where: { id: targetProjectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    const items = await this.prisma.bOQItem.findMany({
      where: { projectId: targetProjectId },
      select: { id: true, code: true }
    });
    return { existingCodes: new Map(items.map((item) => [item.code, item.id])) };
  }

  private seenKeys(type: ImportType, sheet: ParsedSheet, mapping: Record<string, number>): Map<string, number> {
    const field = type === "clients" ? "email" : "code";
    const column = mapping[field] ?? -1;
    if (column < 0) return new Map();
    const entries = sheet.rows.map((row) => ({
      index: row.index,
      key:
        type === "clients"
          ? normalizeEmailValue(row.cells[column]?.text ?? "")
          : (row.cells[column]?.text ?? "").trim().toUpperCase()
    }));
    return firstSeenKeys(entries);
  }

  /**
   * Magic-byte check for the batch media path: the shared validate() used by regular
   * site updates checks size/mime/extension only, so batch imports additionally verify
   * the file content signature for images and videos before storing.
   */
  private assertMediaSignature(file: Express.Multer.File) {
    const buffer = file.buffer;
    const mime = file.mimetype;
    if (mime === "image/jpeg") {
      if (!(buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
        throw new BadRequestException(`"${file.originalname}" is not a genuine JPEG file.`);
      }
      return;
    }
    if (mime === "image/png") {
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (!(buffer.length >= 8 && buffer.subarray(0, 8).equals(signature))) {
        throw new BadRequestException(`"${file.originalname}" is not a genuine PNG file.`);
      }
      return;
    }
    if (mime === "image/webp") {
      if (!(buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP")) {
        throw new BadRequestException(`"${file.originalname}" is not a genuine WebP file.`);
      }
      return;
    }
    if (mime === "video/webm") {
      if (!(buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)) {
        throw new BadRequestException(`"${file.originalname}" is not a genuine WebM file.`);
      }
      return;
    }
    if (mime === "video/mp4") {
      if (!(buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp")) {
        throw new BadRequestException(`"${file.originalname}" is not a genuine MP4 file.`);
      }
      return;
    }
    // Other types are rejected by the storage validator's allow-list anyway.
  }
}

/* --------------------------------- helpers ----------------------------------- */

function aliasesFor(type: ImportType): Record<string, string[]> {
  if (type === "clients") return CLIENT_FIELD_ALIASES;
  if (type === "projects") return PROJECT_FIELD_ALIASES;
  return BOQ_FIELD_ALIASES;
}

function requiredFieldsFor(type: ImportType): string[] {
  if (type === "clients") return ["name", "email"];
  if (type === "projects") return ["code", "name", "category", "clientEmail", "engineerEmail"];
  return ["code", "description", "unit", "quantity", "unitRate"];
}

function validateRowFor(
  type: ImportType,
  index: number,
  record: Record<string, string>,
  formulaFields: string[],
  ctx: ClientImportContext | ProjectImportContext | BoqImportContext,
  seen: Map<string, number>
) {
  if (type === "clients") {
    return validateClientRow(index, record, formulaFields, ctx as ClientImportContext, seen);
  }
  if (type === "projects") {
    return validateProjectRow(index, record, formulaFields, ctx as ProjectImportContext, seen);
  }
  return validateBoqRow(index, record, formulaFields, ctx as BoqImportContext, seen);
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function parseSiteUpdateType(value: string | undefined): SiteUpdateType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
  const upper = value.trim().toUpperCase();
  const direct = SITE_UPDATE_TYPES.find((item) => item === upper);
  if (direct) return direct;
  return MEDIA_TYPE_ALIASES[normalized] ?? null;
}

function parseManifestFlag(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "نعم", "ظاهر"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "لا", "مخفي"].includes(normalized)) return false;
  return null;
}

function parseManifestDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T00:00:00.000Z`)
    : new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function requiredProjectId(query: { projectId?: string | undefined }): string {
  const id = query.projectId?.trim();
  if (!id) {
    throw new BadRequestException("A projectId is required for this export.");
  }
  return id;
}

function minorUnits(value: number, digits: number): string {
  const padded = Math.abs(Math.trunc(value)).toString().padStart(digits + 1, "0");
  const integer = padded.slice(0, padded.length - digits);
  const fraction = digits > 0 ? `.${padded.slice(padded.length - digits)}` : "";
  const sign = value < 0 ? "-" : "";
  return `${sign}${integer}${fraction}`;
}

export { DUPLICATE_STRATEGIES, previewLineTotal };
