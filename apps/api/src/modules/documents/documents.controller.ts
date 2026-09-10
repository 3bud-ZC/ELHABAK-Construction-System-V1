import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { StorageService } from "../projects/storage.service";
import { DocumentsService } from "./documents.service";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/documents")
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly storage: StorageService
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("status") status?: string
  ) {
    return this.documents.list(user, projectId, search, category, status);
  }

  @Get(":documentId")
  get(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documents.get(user, projectId, documentId);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  create(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.documents.create(user, projectId, body, file);
  }

  @Patch(":documentId")
  updateMetadata(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("documentId") documentId: string,
    @Body() body: unknown
  ) {
    return this.documents.updateMetadata(user, projectId, documentId, body);
  }

  @Post(":documentId/versions")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  addVersion(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.documents.addVersion(user, projectId, documentId, body, file);
  }

  @Patch(":documentId/visibility")
  setVisibility(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("documentId") documentId: string,
    @Body() body: unknown
  ) {
    return this.documents.setVisibility(user, projectId, documentId, body);
  }

  @Post(":documentId/archive")
  archive(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documents.archive(user, projectId, documentId);
  }

  @Post(":documentId/restore")
  restore(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documents.restore(user, projectId, documentId);
  }

  @Get(":documentId/history")
  getHistory(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documents.getHistory(user, projectId, documentId);
  }

  @Get(":documentId/versions/:versionId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async file(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @Query("download") download: string | undefined,
    @Res() response: Response
  ) {
    const version = await this.documents.getFile(user, projectId, documentId, versionId);
    const file = this.storage.open(version.storagePath);
    const disposition = download === "1" ? "attachment" : "inline";
    response.setHeader("Content-Type", version.mimeType);
    response.setHeader("Content-Length", String(version.fileSize));
    response.setHeader(
      "Content-Disposition",
      `${disposition}; filename="document-file"; filename*=UTF-8''${encodeURIComponent(version.originalFilename)}`
    );
    file.stream.pipe(response);
  }
}
