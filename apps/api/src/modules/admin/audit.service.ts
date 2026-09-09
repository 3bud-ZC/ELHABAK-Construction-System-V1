import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";

type AuditValue = string | number | boolean | null | string[];

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorId: string, action: string, metadata?: Record<string, AuditValue>, projectId?: string) {
    const data = {
      actorId,
      action,
      ...(metadata ? { metadata } : {}),
      ...(projectId ? { projectId } : {})
    };

    await this.prisma.auditLog.create({
      data
    });
  }
}
