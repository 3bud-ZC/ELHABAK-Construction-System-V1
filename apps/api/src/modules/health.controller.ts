import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@elhabak/validation";
import { PrismaService } from "../shared/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health(): Promise<HealthResponse> {
    const database = await this.prisma.isAvailable();
    const commit = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA;

    return {
      status: database ? "ok" : "degraded",
      service: "elhabak-api",
      timestamp: new Date().toISOString(),
      database: database ? "connected" : "unavailable",
      ...(commit ? { commit } : {}),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }
}
