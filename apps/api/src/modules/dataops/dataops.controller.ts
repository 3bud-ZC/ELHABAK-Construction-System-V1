import {
  BadRequestException,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryUploadOptions } from "../../shared/upload";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../../shared/http.types";
import { DataOpsService, type ImportOptions, type ImportType } from "./dataops.service";

const IMPORT_TYPES: ImportType[] = ["clients", "projects", "boq"];
const EXPORT_FORMATS = ["xlsx", "csv"] as const;

function assertImportType(type: string): ImportType {
  if (!IMPORT_TYPES.includes(type as ImportType)) {
    throw new BadRequestException("Unknown import type.");
  }
  return type as ImportType;
}

function parseOptions(request: AuthenticatedRequest): ImportOptions {
  const body = (request.body ?? {}) as Record<string, unknown>;
  let mapping: Record<string, number> | undefined;
  if (typeof body.mapping === "string" && body.mapping.trim()) {
    try {
      const parsed = JSON.parse(body.mapping) as Record<string, unknown>;
      mapping = {};
      for (const [key, value] of Object.entries(parsed)) {
        const column = Number(value);
        if (Number.isInteger(column) && column >= -1) mapping[key] = column;
      }
    } catch {
      throw new BadRequestException("Invalid column mapping payload.");
    }
  }
  const strategy = typeof body.strategy === "string" ? body.strategy : undefined;
  if (strategy && !["error", "skip", "update"].includes(strategy)) {
    throw new BadRequestException("Invalid duplicate strategy.");
  }
  return {
    sheet: typeof body.sheet === "string" && body.sheet.trim() ? body.sheet.trim() : undefined,
    mapping,
    strategy: strategy as ImportOptions["strategy"],
    projectId: typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : undefined
  };
}

@UseGuards(AuthGuard)
@Controller("data-ops")
export class DataOpsController {
  constructor(private readonly dataOps: DataOpsService) {}

  @Get("overview")
  overview(@CurrentUser() user: RequestUser) {
    return this.dataOps.overview(user);
  }

  @Get("jobs")
  jobs(@CurrentUser() user: RequestUser) {
    return this.dataOps.listJobs(user);
  }

  @Get("templates/:type")
  async template(@CurrentUser() user: RequestUser, @Param("type") rawType: string, @Res() response: Response) {
    const type = assertImportType(rawType);
    if (type === "boq" && user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      throw new BadRequestException("BOQ templates are limited to administrators and accountants.");
    }
    if ((type === "clients" || type === "projects") && user.role !== "ADMIN") {
      throw new BadRequestException("Import templates are limited to administrators.");
    }
    const file = await this.dataOps.template(type);
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    response.send(file.body);
  }

  @Post("imports/:type/preview")
  @UseInterceptors(FileInterceptor("file", memoryUploadOptions))
  preview(
    @CurrentUser() user: RequestUser,
    @Param("type") rawType: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 })]
      })
    )
    file: Express.Multer.File
  ) {
    return this.dataOps.previewImport(user, assertImportType(rawType), file, parseOptions(request));
  }

  @Post("imports/:type/commit")
  @UseInterceptors(FileInterceptor("file", memoryUploadOptions))
  commit(
    @CurrentUser() user: RequestUser,
    @Param("type") rawType: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 })]
      })
    )
    file: Express.Multer.File
  ) {
    return this.dataOps.commitImport(user, assertImportType(rawType), file, parseOptions(request));
  }

  @Post("media-batch")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "media", maxCount: 30 },
        { name: "manifest", maxCount: 1 }
      ],
      memoryUploadOptions
    )
  )
  mediaBatch(
    @CurrentUser() user: RequestUser,
    @Req() request: AuthenticatedRequest,
    @UploadedFiles()
    files: { media?: Express.Multer.File[]; manifest?: Express.Multer.File[] }
  ) {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    if (!projectId) {
      throw new BadRequestException("A target project is required.");
    }
    return this.dataOps.mediaBatch(
      user,
      projectId,
      {
        type: typeof body.type === "string" ? body.type : undefined,
        isClientVisible: typeof body.isClientVisible === "string" ? body.isClientVisible : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
        strictManifest: typeof body.strictManifest === "string" ? body.strictManifest : undefined
      },
      files.media ?? [],
      files.manifest?.[0]
    );
  }

  @Get("exports/:dataset")
  async exportDataset(
    @CurrentUser() user: RequestUser,
    @Param("dataset") dataset: string,
    @Query("format") format: string,
    @Query("projectId") projectId: string | undefined,
    @Res() response: Response
  ) {
    const resolved = EXPORT_FORMATS.includes(format as (typeof EXPORT_FORMATS)[number]) ? (format as "xlsx" | "csv") : "xlsx";
    const file = await this.dataOps.exportDataset(user, dataset, resolved, { projectId });
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(file.body);
  }
}
