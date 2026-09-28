import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Prisma, UserRole } from "@elhabak/database";
import { createClientSchema, updateClientSchema } from "@elhabak/validation";
import { AuthService, normalizeEmail, toRequestUser } from "../auth/auth.service";
import { generateClientTemporaryPassword } from "../auth/temporary-password";
import { PrismaService } from "../../shared/prisma.service";
import { AuditService } from "./audit.service";
import { parseBody } from "../../shared/zod";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { PageRequest } from "../../shared/paging";

const clientUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway
  ) {}

  /**
   * Without `paging` returns the full array (project-form pickers). With `paging` the
   * Clients register gets one bounded page, server-side search/status filtering, a
   * stable order and whole-table summary counts, so it scales past a few hundred rows.
   */
  async list(search?: string, paging?: PageRequest | null, status?: "ACTIVE" | "INACTIVE") {
    const trimmedSearch = search?.trim();
    const where: Prisma.ClientProfileWhereInput = {};

    if (trimmedSearch) {
      where.OR = [
        { user: { email: { contains: trimmedSearch, mode: "insensitive" } } },
        { user: { displayName: { contains: trimmedSearch, mode: "insensitive" } } },
        { phone: { contains: trimmedSearch, mode: "insensitive" } }
      ];
    }
    if (status === "ACTIVE") where.user = { isActive: true, archivedAt: null };
    if (status === "INACTIVE") where.user = { OR: [{ isActive: false }, { archivedAt: { not: null } }] };

    const clients = await this.prisma.clientProfile.findMany({
      where,
      include: {
        user: { select: clientUserSelect },
        projects: { select: { id: true, status: true, updatedAt: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(paging ? { skip: paging.skip, take: paging.pageSize } : {})
    });

    const rows = clients.map((client) => {
      const response = toClientResponse(client);
      const activeProjects = client.projects.filter((project) => project.status === "ACTIVE").length;
      const lastActivity = client.projects.reduce<Date | null>(
        (latest, project) => (project.updatedAt > (latest ?? new Date(0)) ? project.updatedAt : latest),
        null
      );
      return {
        ...response,
        projectCount: client.projects.length,
        activeProjectCount: activeProjects,
        lastProjectActivityAt: lastActivity?.toISOString() ?? null
      };
    });
    if (!paging) return rows;

    const [total, all, active, contactReady] = await Promise.all([
      this.prisma.clientProfile.count({ where }),
      this.prisma.clientProfile.count(),
      this.prisma.clientProfile.count({ where: { user: { isActive: true, archivedAt: null } } }),
      this.prisma.clientProfile.count({ where: { phone: { not: null } } })
    ]);
    return {
      items: rows,
      total,
      page: paging.page,
      pageSize: paging.pageSize,
      summary: { total: all, active, inactive: all - active, contactReady }
    };
  }

  async get(id: string) {
    const client = await this.prisma.clientProfile.findUnique({
      where: { id },
      include: { user: { select: clientUserSelect } }
    });

    if (!client) {
      throw new NotFoundException("Client not found.");
    }

    return toClientResponse(client);
  }

  async create(actorId: string, rawBody: unknown) {
    const input = parseBody(createClientSchema, rawBody);
    const displayName = input.displayName.trim();
    const generatedPassword = generateClientTemporaryPassword(input.phone);
    const baseEmail = input.email?.trim() ? normalizeEmail(input.email) : await this.nextGeneratedEmail(displayName);
    const passwordHash = await this.authService.hashPassword(generatedPassword);

    try {
      const data: Prisma.ClientProfileCreateInput = {
        user: {
          create: {
            email: baseEmail,
            displayName,
            role: "CLIENT",
            isActive: input.isActive,
            passwordHash,
            mustChangePassword: true
          }
        }
      };

      data.phone = input.phone;
      const notes = emptyToNull(input.notes);
      if (notes !== undefined) data.notes = notes;

      const client = await this.prisma.clientProfile.create({
        data,
        include: { user: { select: clientUserSelect } }
      });

      await this.audit.record(actorId, "client.created", {
        clientId: client.id,
        userId: client.userId,
        isActive: client.user.isActive,
        generatedLogin: !input.email?.trim()
      });

      // The only time this plaintext exists outside the client's hands: returned once
      // (no-store), never persisted, never audited, never logged.
      return {
        ...toClientResponse(client),
        generatedCredentials: {
          email: client.user.email,
          phone: client.phone,
          temporaryPassword: generatedPassword
        }
      };
    } catch (error) {
      handleUniqueEmail(error);
    }
  }

  private async nextGeneratedEmail(displayName: string) {
    const base = `${toLoginSlug(displayName)}@elhabak.com`;
    let candidate = base;
    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const exists = await this.prisma.user.findUnique({ where: { email: candidate }, select: { id: true } });
      if (!exists) return candidate;
      candidate = `${toLoginSlug(displayName)}.${suffix}@elhabak.com`;
    }
    throw new ConflictException("Unable to generate a unique client login identifier.");
  }

  async update(actorId: string, id: string, rawBody: unknown) {
    const input = parseBody(updateClientSchema, rawBody);
    const existing = await this.prisma.clientProfile.findUnique({
      where: { id },
      include: { user: { select: clientUserSelect } }
    });

    if (!existing) {
      throw new NotFoundException("Client not found.");
    }

    const userData: Prisma.UserUpdateInput = {};

    if (input.email !== undefined) {
      userData.email = normalizeEmail(input.email);
    }
    if (input.displayName !== undefined) {
      userData.displayName = input.displayName.trim();
    }
    if (input.isActive !== undefined) {
      if (existing.user.archivedAt) {
        throw new ConflictException("Restore the archived user account from Users before changing its active state.");
      }
      userData.isActive = input.isActive;
    }

    try {
      const data: Prisma.ClientProfileUpdateInput = {};
      const notes = emptyToNull(input.notes);

      if (input.phone !== undefined) {
        data.phone = input.phone;
      }
      if (notes !== undefined) {
        data.notes = notes;
      }
      if (Object.keys(userData).length > 0) {
        data.user = { update: userData };
      }

      const client = await this.prisma.clientProfile.update({
        where: { id },
        data,
        include: { user: { select: clientUserSelect } }
      });

      await this.audit.record(actorId, "client.edited", {
        clientId: id,
        userId: client.userId
      });

      if (input.isActive !== undefined && input.isActive !== existing.user.isActive) {
        if (!input.isActive) await this.revokeSessions(existing.userId);
        await this.audit.record(actorId, input.isActive ? "user.activated" : "user.suspended", {
          targetUserId: existing.userId
        });
      }

      return toClientResponse(client);
    } catch (error) {
      handleUniqueEmail(error);
    }
  }

  /**
   * Replaces the client's credential with a freshly generated temporary password (label
   * taken from the stored mobile), flags it for first-login change, revokes every live
   * session, and returns the plaintext exactly once. The Admin never types a client
   * password: a lost credential is recovered only by generating a new one.
   */
  async resetPassword(actorId: string, id: string) {
    const existing = await this.prisma.clientProfile.findUnique({
      where: { id },
      include: { user: { select: clientUserSelect } }
    });
    if (!existing) throw new NotFoundException("Client not found.");
    if (existing.user.archivedAt) {
      throw new ConflictException("Restore the archived client account before resetting its password.");
    }

    const temporaryPassword = generateClientTemporaryPassword(existing.phone);
    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { passwordHash: await this.authService.hashPassword(temporaryPassword), mustChangePassword: true }
    });
    const sessionsRevoked = await this.revokeSessions(existing.userId);
    await this.audit.record(actorId, "user.password_reset", {
      targetUserId: existing.userId,
      clientId: existing.id,
      method: "generated",
      sessionsRevoked
    });

    return {
      clientId: existing.id,
      displayName: existing.user.displayName,
      email: existing.user.email,
      phone: existing.phone,
      isActive: existing.user.isActive,
      temporaryPassword,
      sessionsRevoked
    };
  }

  private async revokeSessions(userId: string) {
    const count = await this.authService.revokeUserSessions(userId);
    this.realtime.disconnectUser(userId);
    return count;
  }
}

function toClientResponse(client: {
  id: string;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    isActive: boolean;
    mustChangePassword: boolean;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}) {
  return {
    id: client.id,
    user: {
      ...toRequestUser(client.user),
      createdAt: client.user.createdAt.toISOString(),
      updatedAt: client.user.updatedAt.toISOString()
    },
    phone: client.phone,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString()
  };
}

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toLoginSlug(value: string) {
  const arabic = value
    .replace(/[أإآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي");
  const transliterated = arabic
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
  return transliterated || `client-${randomBytes(4).toString("hex")}`;
}

function handleUniqueEmail(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    throw new ConflictException("Email is already in use.");
  }

  throw error;
}
