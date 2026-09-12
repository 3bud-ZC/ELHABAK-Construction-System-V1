import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, UserRole } from "@elhabak/database";
import { createUserSchema, resetUserPasswordSchema, updateUserSchema } from "@elhabak/validation";
import type { CreateUserInput, UpdateUserInput } from "@elhabak/validation";
import { AuthService, normalizeEmail, toRequestUser } from "../auth/auth.service";
import { PrismaService } from "../../shared/prisma.service";
import { AuditService } from "./audit.service";
import { parseBody } from "../../shared/zod";
import { RealtimeGateway } from "../realtime/realtime.gateway";

const PRIMARY_ADMIN_EMAIL = "mohamed.elhabak@elhabak.local";

const userResponseSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const linkedHistorySelect = {
  assignments: true,
  engineeredProjects: true,
  siteUpdates: true,
  uploadedMedia: true,
  uploadedDesignRevisions: true,
  designEvents: true,
  auditLogs: true,
  financialProfilesUpdated: true,
  costEstimatesCreated: true,
  boqItemsCreated: true,
  expensesCreated: true,
  clientPaymentsCreated: true,
  contractorPaymentsCreated: true,
  financialAttachmentsUploaded: true,
  documentsCreated: true,
  documentVersionsUploaded: true,
  projectMessages: true,
  chatReadStates: true,
  notifications: true
} satisfies Prisma.UserCountOutputTypeSelect;

type AccountStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway
  ) {}

  async list(search?: string, role?: UserRole, status?: AccountStatus) {
    const trimmedSearch = search?.trim();
    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;
    if (status === "ACTIVE") Object.assign(where, { isActive: true, archivedAt: null });
    if (status === "SUSPENDED") Object.assign(where, { isActive: false, archivedAt: null });
    if (status === "ARCHIVED") where.archivedAt = { not: null };
    if (trimmedSearch) {
      where.OR = [
        { email: { contains: trimmedSearch, mode: "insensitive" } },
        { displayName: { contains: trimmedSearch, mode: "insensitive" } }
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: userResponseSelect,
      orderBy: [{ createdAt: "desc" }]
    });
    return users.map(toUserResponse);
  }

  async get(id: string) {
    return toUserResponse(await this.findUser(id));
  }

  async create(actorId: string, rawBody: unknown) {
    const input = parseBody(createUserSchema, rawBody);
    const passwordHash = await this.authService.hashPassword(input.temporaryPassword);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizeEmail(input.email),
          displayName: input.displayName.trim(),
          role: input.role,
          isActive: input.isActive,
          passwordHash
        },
        select: userResponseSelect
      });
      await this.audit.record(actorId, "user.created", {
        targetUserId: user.id,
        role: user.role,
        isActive: user.isActive
      });
      return toUserResponse(user);
    } catch (error) {
      handleUniqueEmail(error);
    }
  }

  async update(actorId: string, id: string, rawBody: unknown) {
    const input = parseBody(updateUserSchema, rawBody);
    const existing = await this.findUser(id);
    this.assertPrimaryAdminUnchanged(existing.email);
    if (id === actorId && (input.role !== undefined || input.isActive === false)) {
      throw new ForbiddenException("You cannot change your own role or suspend your own account.");
    }
    if (existing.archivedAt && input.isActive !== undefined) {
      throw new ConflictException("Restore the archived account before changing its active state.");
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = normalizeEmail(input.email);
    if (input.displayName !== undefined) data.displayName = input.displayName.trim();
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.temporaryPassword !== undefined) data.passwordHash = await this.authService.hashPassword(input.temporaryPassword);

    try {
      const user = await this.prisma.user.update({ where: { id }, data, select: userResponseSelect });
      if (input.role !== undefined && input.role !== existing.role) {
        await this.audit.record(actorId, "user.role_changed", { targetUserId: id, from: existing.role, to: input.role });
      }
      if (input.isActive !== undefined && input.isActive !== existing.isActive) {
        if (!input.isActive) await this.revokeSessions(id);
        await this.audit.record(actorId, input.isActive ? "user.activated" : "user.suspended", { targetUserId: id });
      }
      if (input.temporaryPassword !== undefined) {
        await this.revokeSessions(id);
        await this.audit.record(actorId, "user.password_reset", { targetUserId: id });
      }
      await this.audit.record(actorId, "user.updated", { targetUserId: id });
      return toUserResponse(user);
    } catch (error) {
      handleUniqueEmail(error);
    }
  }

  async activate(actorId: string, id: string) {
    const existing = await this.findUser(id);
    this.assertLifecycleAllowed(actorId, existing);
    if (existing.archivedAt) throw new ConflictException("Archived accounts must be restored.");
    if (existing.isActive) throw new ConflictException("Account is already active.");

    const user = await this.prisma.user.update({ where: { id }, data: { isActive: true }, select: userResponseSelect });
    await this.audit.record(actorId, "user.activated", { targetUserId: id });
    return toUserResponse(user);
  }

  async suspend(actorId: string, id: string) {
    const existing = await this.findUser(id);
    this.assertLifecycleAllowed(actorId, existing);
    if (existing.archivedAt) throw new ConflictException("Archived account cannot be suspended.");
    if (!existing.isActive) throw new ConflictException("Account is already suspended.");

    const user = await this.prisma.user.update({ where: { id }, data: { isActive: false }, select: userResponseSelect });
    const sessionsRevoked = await this.revokeSessions(id);
    await this.audit.record(actorId, "user.suspended", { targetUserId: id, sessionsRevoked });
    return toUserResponse(user);
  }

  async archive(actorId: string, id: string) {
    const existing = await this.findUser(id);
    this.assertLifecycleAllowed(actorId, existing);
    if (existing.archivedAt) throw new ConflictException("Account is already archived.");

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
      select: userResponseSelect
    });
    const sessionsRevoked = await this.revokeSessions(id);
    await this.audit.record(actorId, "user.archived", { targetUserId: id, sessionsRevoked });
    return toUserResponse(user);
  }

  async restore(actorId: string, id: string) {
    const existing = await this.findUser(id);
    this.assertLifecycleAllowed(actorId, existing);
    if (!existing.archivedAt) throw new ConflictException("Account is not archived.");

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, archivedAt: null },
      select: userResponseSelect
    });
    await this.audit.record(actorId, "user.restored", { targetUserId: id });
    return toUserResponse(user);
  }

  async resetPassword(actorId: string, id: string, rawBody: unknown) {
    const input = parseBody(resetUserPasswordSchema, rawBody);
    const existing = await this.findUser(id);
    this.assertPrimaryAdminUnchanged(existing.email);
    if (existing.archivedAt) throw new ConflictException("Restore the archived account before resetting its password.");

    const passwordHash = await this.authService.hashPassword(input.temporaryPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    const sessionsRevoked = await this.revokeSessions(id);
    await this.audit.record(actorId, "user.password_reset", { targetUserId: id, sessionsRevoked });
    return { ok: true };
  }

  async deletionImpact(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...userResponseSelect, clientProfile: { select: { id: true } }, _count: { select: linkedHistorySelect } }
    });
    if (!user) throw new NotFoundException("User not found.");

    const linkedRecords = Object.entries(user._count)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
      .map(([relation, count]) => ({ relation, count }));
    if (user.clientProfile) linkedRecords.unshift({ relation: "clientProfile", count: 1 });
    return {
      canPermanentlyDelete: user.email !== PRIMARY_ADMIN_EMAIL && linkedRecords.length === 0,
      linkedRecords,
      protectedPrimaryAdmin: user.email === PRIMARY_ADMIN_EMAIL
    };
  }

  async permanentlyDelete(actorId: string, id: string) {
    const user = await this.findUser(id);
    this.assertLifecycleAllowed(actorId, user);
    const impact = await this.deletionImpact(id);
    if (!impact.canPermanentlyDelete) {
      const summary = impact.linkedRecords.map((item) => `${item.relation}: ${item.count}`).join(", ");
      throw new ConflictException(`Account has linked business or audit history and cannot be permanently deleted. Archive it instead. ${summary}`);
    }

    await this.revokeSessions(id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.record(actorId, "user.deleted", { targetUserId: id, role: user.role });
    return { ok: true, mode: "deleted" as const };
  }

  async impersonate(sessionId: string | undefined, targetUserId: string) {
    return { user: await this.authService.startImpersonation(sessionId, targetUserId) };
  }

  private async findUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userResponseSelect });
    if (!user) throw new NotFoundException("User not found.");
    return user;
  }

  private assertLifecycleAllowed(actorId: string, user: UserWithDates) {
    this.assertPrimaryAdminUnchanged(user.email);
    if (actorId === user.id) throw new ForbiddenException("You cannot change your own account lifecycle.");
  }

  private assertPrimaryAdminUnchanged(email: string) {
    if (email === PRIMARY_ADMIN_EMAIL) {
      throw new ForbiddenException("The primary Admin account is protected and cannot be altered.");
    }
  }

  private async revokeSessions(userId: string) {
    const count = await this.authService.revokeUserSessions(userId);
    this.realtime.disconnectUser(userId);
    return count;
  }
}

type UserWithDates = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toUserResponse(user: UserWithDates) {
  return {
    ...toRequestUser(user),
    status: accountStatus(user),
    archivedAt: user.archivedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function accountStatus(user: Pick<UserWithDates, "isActive" | "archivedAt">): AccountStatus {
  if (user.archivedAt) return "ARCHIVED";
  return user.isActive ? "ACTIVE" : "SUSPENDED";
}

function handleUniqueEmail(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
    throw new ConflictException("Email is already in use.");
  }
  throw error;
}

export type { CreateUserInput, UpdateUserInput };
