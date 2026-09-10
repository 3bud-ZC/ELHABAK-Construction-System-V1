import { BadRequestException, Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
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

export type StoredDocumentFile = {
  storedFilename: string;
  storagePath: string;
  extension: string;
  checksumSha256: string;
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

  validateFinanceAttachment(file: Express.Multer.File) {
    if (file.size === 0 || file.size > this.maxBytes) {
      throw new BadRequestException(file.size === 0 ? "File is empty." : "File is too large.");
    }

    const extension = extname(file.originalname).toLowerCase();
    const expectedMime = designMimeFor(extension);
    if (!expectedMime || expectedMime !== file.mimetype || !hasExpectedSignature(file.buffer, expectedMime)) {
      throw new BadRequestException("Only genuine PDF, PNG, JPG, and JPEG files are allowed.");
    }
  }

  async storeFinanceAttachment(projectId: string, file: Express.Multer.File): Promise<StoredDesignFile> {
    this.validateFinanceAttachment(file);
    const extension = extname(file.originalname).toLowerCase();
    const storedFilename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}${extension}`;
    const relativePath = join("projects", projectId, "finance", storedFilename);
    const absolutePath = this.absolutePath(relativePath);

    await mkdir(resolve(this.root, "projects", projectId, "finance"), { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });
    return { storedFilename, storagePath: relativePath.replace(/\\/g, "/") };
  }

  /**
   * DOCX/XLSX validation is deliberately shallow: extension, declared MIME, and the ZIP
   * local-file-header magic bytes (`PK\x03\x04`) are checked, since both formats are ZIP
   * containers. This proves the upload is a genuine Office Open XML container, not that
   * its internal XML parts are well-formed - deep OOXML content validation is not
   * implemented, and this module makes no claim that it is.
   */
  validateDocumentFile(file: Express.Multer.File): string {
    if (file.size === 0 || file.size > this.maxBytes) {
      throw new BadRequestException(file.size === 0 ? "File is empty." : "File is too large.");
    }

    const extension = extname(file.originalname).toLowerCase();
    const expectedMime = documentMimeFor(extension);
    if (!expectedMime || expectedMime !== file.mimetype || !hasExpectedDocumentSignature(file.buffer, extension)) {
      throw new BadRequestException("Only genuine PDF, PNG, JPG, JPEG, DOCX, and XLSX files are allowed.");
    }
    return extension;
  }

  async storeDocumentVersion(
    projectId: string,
    documentId: string,
    versionNumber: number,
    file: Express.Multer.File
  ): Promise<StoredDocumentFile> {
    const extension = this.validateDocumentFile(file);
    const storedFilename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}${extension}`;
    const versionDir = join("projects", projectId, "documents", documentId, `v${versionNumber}`);
    const relativePath = join(versionDir, storedFilename);
    const absolutePath = this.absolutePath(relativePath);

    await mkdir(resolve(this.root, versionDir), { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });
    const checksumSha256 = createHash("sha256").update(file.buffer).digest("hex");

    return {
      storedFilename,
      storagePath: relativePath.replace(/\\/g, "/"),
      extension,
      checksumSha256
    };
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

function documentMimeFor(extension: string): string | null {
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return null;
}

function hasExpectedDocumentSignature(buffer: Buffer, extension: string) {
  if (extension === ".pdf") return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === ".png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (extension === ".docx" || extension === ".xlsx") {
    // ZIP local-file-header signature (PK\x03\x04) - both formats are Office Open XML ZIP containers.
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }
  return false;
}
