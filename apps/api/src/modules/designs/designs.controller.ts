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
import { DesignsService } from "./designs.service";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/designs")
export class DesignsController {
  constructor(
    private readonly designs: DesignsService,
    private readonly storage: StorageService
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("discipline") discipline?: string
  ) {
    return this.designs.list(user, projectId, search, status, discipline);
  }

  @Get(":designId")
  get(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("designId") designId: string) {
    return this.designs.get(user, projectId, designId);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  create(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.designs.create(user, projectId, body, file);
  }

  @Patch(":designId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Body() body: unknown
  ) {
    return this.designs.update(user, projectId, designId, body);
  }

  @Post(":designId/revisions")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  addRevision(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.designs.addRevision(user, projectId, designId, body, file);
  }

  @Post(":designId/revisions/:revisionId/submit")
  submit(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Param("revisionId") revisionId: string
  ) {
    return this.designs.submit(user, projectId, designId, revisionId);
  }

  @Post(":designId/revisions/:revisionId/decision")
  decide(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Param("revisionId") revisionId: string,
    @Body() body: unknown
  ) {
    return this.designs.decide(user, projectId, designId, revisionId, body);
  }

  @Post(":designId/comments")
  comment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Body() body: unknown
  ) {
    return this.designs.comment(user, projectId, designId, body);
  }

  @Get(":designId/revisions/:revisionId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async file(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("designId") designId: string,
    @Param("revisionId") revisionId: string,
    @Query("download") download: string | undefined,
    @Res() response: Response
  ) {
    const revision = await this.designs.getFile(user, projectId, designId, revisionId);
    const file = this.storage.open(revision.storagePath);
    const disposition = download === "1" ? "attachment" : "inline";
    response.setHeader("Content-Type", revision.mimeType);
    response.setHeader("Content-Length", String(revision.fileSize));
    response.setHeader("Content-Disposition", `${disposition}; filename="design-file"; filename*=UTF-8''${encodeURIComponent(revision.originalFilename)}`);
    file.stream.pipe(response);
  }
}
