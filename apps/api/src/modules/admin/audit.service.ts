import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorId: string, action: string, metadata?: Record<string, string | boolean | null>) {
    const data = metadata ? { actorId, action, metadata } : { actorId, action };

    await this.prisma.auditLog.create({
      data
    });
  }
}
