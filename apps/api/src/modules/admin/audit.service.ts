import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";

type AuditValue = string | number | boolean | null | string[];

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actor: string | RequestUser, action: string, metadata?: Record<string, AuditValue>, projectId?: string) {
    const actorId = typeof actor === "string" ? actor : (actor.impersonation?.actorId ?? actor.id);
    const effectiveMetadata =
      typeof actor !== "string" && actor.impersonation
        ? { ...metadata, effectiveUserId: actor.id, impersonated: true }
        : metadata;
    const data = {
      actorId,
      action,
      ...(effectiveMetadata ? { metadata: effectiveMetadata } : {}),
      ...(projectId ? { projectId } : {})
    };

    await this.prisma.auditLog.create({
      data
    });
  }
}
