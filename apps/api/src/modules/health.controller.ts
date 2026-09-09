import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@elhabak/validation";
import { PrismaService } from "../shared/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health(): Promise<HealthResponse> {
    const database = await this.prisma.isAvailable();

    return {
      status: database ? "ok" : "degraded",
      service: "elhabak-api",
      timestamp: new Date().toISOString(),
      database: database ? "connected" : "unavailable"
    };
  }
}
