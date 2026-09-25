import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Prisma, UserRole } from "@elhabak/database";
import { createClientSchema, updateClientSchema } from "@elhabak/validation";
import { AuthService, normalizeEmail, toRequestUser } from "../auth/auth.service";
import { PrismaService } from "../../shared/prisma.service";
import { AuditService } from "./audit.service";
import { parseBody } from "../../shared/zod";
import { RealtimeGateway } from "../realtime/realtime.gateway";

const clientUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
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

  async list(search?: string) {
    const trimmedSearch = search?.trim();
    const where: Prisma.ClientProfileWhereInput = {};

    if (trimmedSearch) {
      where.OR = [
        { user: { email: { contains: trimmedSearch, mode: "insensitive" } } },
        { user: { displayName: { contains: trimmedSearch, mode: "insensitive" } } },
        { phone: { contains: trimmedSearch, mode: "insensitive" } }
      ];
    }

    const clients = await this.prisma.clientProfile.findMany({
      where,
      include: {
        user: { select: clientUserSelect },
        projects: { select: { id: true, status: true, updatedAt: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return clients.map((client) => {
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
    const generatedPassword = input.temporaryPassword?.trim() || generateTemporaryPassword();
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
            passwordHash
          }
        }
      };

      const phone = emptyToNull(input.phone);
      const notes = emptyToNull(input.notes);
      if (phone !== undefined) data.phone = phone;
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

      return {
        ...toClientResponse(client),
        generatedCredentials: { email: client.user.email, temporaryPassword: generatedPassword }
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
    if (input.temporaryPassword !== undefined) {
      userData.passwordHash = await this.authService.hashPassword(input.temporaryPassword);
    }

    try {
      const data: Prisma.ClientProfileUpdateInput = {};
      const phone = emptyToNull(input.phone);
      const notes = emptyToNull(input.notes);

      if (phone !== undefined) {
        data.phone = phone;
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

      if (input.temporaryPassword !== undefined) {
        await this.revokeSessions(existing.userId);
        await this.audit.record(actorId, "user.password_reset", {
          targetUserId: existing.userId
        });
      }

      return toClientResponse(client);
    } catch (error) {
      handleUniqueEmail(error);
    }
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

function generateTemporaryPassword() {
  return `Ehb-${randomBytes(9).toString("base64url")}`;
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
