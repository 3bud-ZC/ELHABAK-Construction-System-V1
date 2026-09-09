import { BadRequestException, Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { ReadStream } from "node:fs";
import type { SiteMediaType } from "@elhabak/database";

type StoredFile = {
  mediaType: SiteMediaType;
  storedFilename: string;
  storagePath: string;
};

export type StoredDesignFile = {
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
    const absolutePath = this.absolutePath(relativePath);

    await mkdir(resolve(this.root, "projects", projectId, "site-updates"), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      mediaType,
      storedFilename,
      storagePath: relativePath.replace(/\\/g, "/")
    };
  }

  validateDesign(file: Express.Multer.File) {
    if (file.size === 0 || file.size > this.maxBytes) {
      throw new BadRequestException(file.size === 0 ? "File is empty." : "File is too large.");
    }

    const extension = extname(file.originalname).toLowerCase();
    const expectedMime = designMimeFor(extension);
    if (!expectedMime || expectedMime !== file.mimetype || !hasExpectedSignature(file.buffer, expectedMime)) {
      throw new BadRequestException("Only genuine PDF, PNG, JPG, and JPEG files are allowed.");
    }
  }

  async storeDesign(projectId: string, file: Express.Multer.File): Promise<StoredDesignFile> {
    this.validateDesign(file);
    const extension = extname(file.originalname).toLowerCase();
    const storedFilename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}${extension}`;
    const relativePath = join("projects", projectId, "designs", storedFilename);
    const absolutePath = this.absolutePath(relativePath);

    await mkdir(resolve(this.root, "projects", projectId, "designs"), { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });
    return { storedFilename, storagePath: relativePath.replace(/\\/g, "/") };
  }

  async remove(storagePath: string) {
    await unlink(this.absolutePath(storagePath)).catch(() => undefined);
  }

  open(storagePath: string): { stream: ReadStream; filename: string } {
    const absolutePath = this.absolutePath(storagePath);

    return { stream: createReadStream(absolutePath), filename: basename(absolutePath) };
  }

  private absolutePath(storagePath: string) {
    const absolutePath = resolve(this.root, storagePath.replace(/\//g, "\\"));
    const rootPrefix = `${this.root}\\`;
    if (absolutePath !== this.root && !absolutePath.startsWith(rootPrefix)) {
      throw new BadRequestException("Invalid storage path.");
    }
    return absolutePath;
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

function designMimeFor(extension: string): "application/pdf" | "image/png" | "image/jpeg" | null {
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return null;
}

function hasExpectedSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}
