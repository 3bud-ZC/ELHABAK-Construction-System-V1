import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";

const RETENTION_DAYS = 30;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_SWEEP_MS = 60 * 1000;

/**
 * Every sign-in creates an AuthSession row and nothing removed them, so the table grew
 * with every login forever. Sessions that expired or were revoked more than 30 days
 * ago carry no value (the retention window keeps recent history for investigations);
 * they are deleted shortly after start-up and then every 6 hours. Timers are unref'd so
 * they never keep the process (or a test run) alive.
 */
@Injectable()
export class SessionMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionMaintenanceService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    this.timers.push(setTimeout(() => void this.sweep(), FIRST_SWEEP_MS).unref());
    this.timers.push(setInterval(() => void this.sweep(), SWEEP_EVERY_MS).unref());
  }

  onModuleDestroy() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
  }

  async sweep(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
      const result = await this.prisma.authSession.deleteMany({
        where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] }
      });
      if (result.count > 0) this.logger.log(`Removed ${result.count} sessions expired/revoked before ${cutoff.toISOString()}.`);
      return result.count;
    } catch (error) {
      this.logger.error("Session sweep failed.", error instanceof Error ? error.stack : String(error));
      return 0;
    }
  }
}
