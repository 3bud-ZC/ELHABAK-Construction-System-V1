import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { memoryStorage } from "multer";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { StorageService } from "../projects/storage.service";
import { ChatService } from "./chat.service";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/messages")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly storage: StorageService
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string
  ) {
    return this.chat.listMessages(user, projectId, limit ? Number(limit) : undefined, cursor);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  create(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.chat.createMessage(user, projectId, body, file);
  }

  @Get("read-state")
  getReadState(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.chat.getReadState(user, projectId);
  }

  @Post("read")
  markRead(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.chat.markRead(user, projectId);
  }

  @Get(":messageId/voice")
  @Header("Cache-Control", "private, no-store")
  @Header("Accept-Ranges", "bytes")
  async voice(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("messageId") messageId: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const message = await this.chat.getVoiceFile(user, projectId, messageId);
    const storagePath = message.storagePath as string;
    const size = await this.storage.statSize(storagePath);
    const mimeType = message.mimeType ?? "audio/webm";
    const range = request.headers.range;

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match?.[2] ? Number.parseInt(match[2], 10) : size - 1;
      const safeEnd = Math.min(end, size - 1);

      if (Number.isNaN(start) || start > safeEnd) {
        response.status(416).setHeader("Content-Range", `bytes */${size}`).end();
        return;
      }

      response.status(206);
      response.setHeader("Content-Range", `bytes ${start}-${safeEnd}/${size}`);
      response.setHeader("Content-Length", String(safeEnd - start + 1));
      response.setHeader("Content-Type", mimeType);
      this.storage.openRange(storagePath, start, safeEnd).pipe(response);
      return;
    }

    response.setHeader("Content-Type", mimeType);
    response.setHeader("Content-Length", String(size));
    const file = this.storage.open(storagePath);
    file.stream.pipe(response);
  }
}
