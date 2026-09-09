import { Controller, Get, Header, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../../shared/http.types";
import { ProjectsService } from "./projects.service";
import { StorageService } from "./storage.service";

@UseGuards(AuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.projectsService.visibleList(user);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.getForUser(user, id);
  }

  @Post(":id/site-updates")
  @UseInterceptors(FilesInterceptor("media", 8, { storage: memoryStorage() }))
  createSiteUpdate(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.projectsService.createSiteUpdate(user, id, request.body, files);
  }

  @Get(":projectId/media/:mediaId")
  @Header("Cache-Control", "private, no-store")
  async getMedia(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("mediaId") mediaId: string,
    @Res() response: Response
  ) {
    const media = await this.projectsService.getMediaForUser(user, projectId, mediaId);
    const file = this.storageService.open(media.storagePath);
    response.setHeader("Content-Type", media.mimeType);
    response.setHeader("Content-Length", String(media.fileSize));
    response.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(media.originalFilename)}"`);
    file.stream.pipe(response);
  }
}
