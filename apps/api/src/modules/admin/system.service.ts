import { Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import { readdir, stat, statfs } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cpus, freemem, loadavg, totalmem } from "node:os";
import { PrismaService } from "../../shared/prisma.service";

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin-only operational snapshot: process memory/CPU, host load, database round-trip
   * and connection count, storage usage, and the age of the newest backup file when
   * BACKUP_DIR is configured. Cheap enough to call on demand; nothing here is cached.
   */
  async diagnostics() {
    const started = process.hrtime.bigint();
    let database: { connected: boolean; latencyMs: number | null; connections: number | null } = {
      connected: false,
      latencyMs: null,
      connections: null
    };
    try {
      const rows = await this.prisma.$queryRaw<Array<{ connections: bigint }>>`SELECT count(*)::bigint AS connections FROM pg_stat_activity WHERE datname = current_database()`;
      database = {
        connected: true,
        latencyMs: Number(process.hrtime.bigint() - started) / 1e6,
        connections: Number(rows[0]?.connections ?? 0)
      };
    } catch {
      // reported as disconnected
    }

    const memory = process.memoryUsage();
    return {
      checkedAt: new Date().toISOString(),
      process: {
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal
      },
      host: {
        cpus: cpus().length,
        loadAverage: loadavg(),
        totalMemoryBytes: totalmem(),
        freeMemoryBytes: freemem()
      },
      database,
      storage: await this.storageUsage(),
      backups: await this.latestBackup()
    };
  }

  private async latestBackup() {
    const dir = process.env.BACKUP_DIR;
    if (!dir) return { configured: false as const };
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      let newest: { name: string; mtime: Date; size: number } | null = null;
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const info = await stat(join(dir, entry.name));
        if (!newest || info.mtime > newest.mtime) newest = { name: entry.name, mtime: info.mtime, size: info.size };
      }
      return {
        configured: true as const,
        newest: newest
          ? { name: newest.name, ageHours: Math.round((Date.now() - newest.mtime.getTime()) / 36e5), sizeBytes: newest.size }
          : null
      };
    } catch {
      return { configured: true as const, newest: null };
    }
  }

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
