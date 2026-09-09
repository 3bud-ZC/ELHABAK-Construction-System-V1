import { BadRequestException, Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { ReadStream } from "node:fs";
import type { SiteMediaType } from "@elhabak/database";

type StoredFile = {
  mediaType: SiteMediaType;
  storedFilename: string;
  storagePath: string;
};

@Injectable()
export class StorageService {
  private readonly env = parseApiEnv(process.env);
  private readonly root = resolve(process.cwd(), this.env.STORAGE_ROOT);
  private readonly maxBytes = this.env.MAX_UPLOAD_MB * 1024 * 1024;
  private readonly allowedMimeTypes = new Set(this.env.ALLOWED_UPLOAD_MIME_TYPES.split(",").map((item) => item.trim()));

  validate(file: Express.Multer.File) {
    if (file.size > this.maxBytes) {
      throw new BadRequestException("File is too large.");
    }
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Unsupported media type.");
    }

    const extension = extname(file.originalname).toLowerCase();
    const mediaType = mediaTypeFor(file.mimetype, extension);
    if (!mediaType) {
      throw new BadRequestException("Only image and video uploads are allowed.");
    }

    return mediaType;
  }

  async store(projectId: string, file: Express.Multer.File): Promise<StoredFile> {
    const mediaType = this.validate(file);
    const extension = extname(file.originalname).toLowerCase();
    const storedFilename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}${extension}`;
    const relativePath = join("projects", projectId, "site-updates", storedFilename);
    const absolutePath = resolve(this.root, relativePath);

    if (!absolutePath.startsWith(this.root)) {
      throw new BadRequestException("Invalid storage path.");
    }

    await mkdir(resolve(this.root, "projects", projectId, "site-updates"), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      mediaType,
      storedFilename,
      storagePath: relativePath.replace(/\\/g, "/")
    };
  }

  open(storagePath: string): { stream: ReadStream; filename: string } {
    const safePath = storagePath.replace(/\//g, "\\");
    const absolutePath = resolve(this.root, safePath);
    if (!absolutePath.startsWith(this.root)) {
      throw new BadRequestException("Invalid storage path.");
    }

    return { stream: createReadStream(absolutePath), filename: basename(absolutePath) };
  }
}

function mediaTypeFor(mimeType: string, extension: string): SiteMediaType | null {
  if (mimeType.startsWith("image/") && [".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return "IMAGE";
  }
  if (mimeType.startsWith("video/") && [".mp4", ".webm"].includes(extension)) {
    return "VIDEO";
  }
  return null;
}
