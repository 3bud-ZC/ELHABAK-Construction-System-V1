import { Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import { readdir, stat, statfs } from "node:fs/promises";
import { join, resolve } from "node:path";

export type StorageUsageReport = {
  storageRoot: string;
  fileCount: number;
  totalBytes: number;
  filesystem: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
  } | null;
  checkedAt: string;
};

/**
 * Admin-only storage introspection: how much of the mounted Railway volume the local file
 * store actually holds. statfs reports the volume filesystem itself, so capacity reflects
 * the real mount, not the container layer.
 */
@Injectable()
export class SystemService {
  private readonly env = parseApiEnv(process.env);
  private readonly root = resolve(process.cwd(), this.env.STORAGE_ROOT);

  async storageUsage(): Promise<StorageUsageReport> {
    let fileCount = 0;
    let totalBytes = 0;

    try {
      const entries = await readdir(this.root, { recursive: true, withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        fileCount += 1;
        const stats = await stat(join(entry.parentPath, entry.name));
        totalBytes += stats.size;
      }
    } catch {
      // A missing storage root simply means nothing has been uploaded yet.
    }

    let filesystem: StorageUsageReport["filesystem"] = null;
    try {
      const fs = await statfs(this.root);
      const totalBytes = Number(fs.blocks) * Number(fs.bsize);
      const freeBytes = Number(fs.bavail) * Number(fs.bsize);
      filesystem = { totalBytes, freeBytes, usedBytes: Math.max(0, totalBytes - freeBytes) };
    } catch {
      // statfs is unavailable on some filesystems/platforms; usage numbers still stand.
    }

    return {
      storageRoot: this.root,
      fileCount,
      totalBytes,
      filesystem,
      checkedAt: new Date().toISOString()
    };
  }
}
