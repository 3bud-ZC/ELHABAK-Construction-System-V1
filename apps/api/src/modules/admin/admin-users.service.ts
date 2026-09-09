import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, UserRole } from "@elhabak/database";
import { createUserSchema, updateUserSchema } from "@elhabak/validation";
import type { CreateUserInput, UpdateUserInput } from "@elhabak/validation";
import { AuthService, normalizeEmail, toRequestUser } from "../auth/auth.service";
import { PrismaService } from "../../shared/prisma.service";
import { AuditService } from "./audit.service";
import { parseBody } from "../../shared/zod";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly audit: AuditService
  ) {}

  async list(search?: string, role?: UserRole) {
    const trimmedSearch = search?.trim();
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (trimmedSearch) {
      where.OR = [
        { email: { contains: trimmedSearch, mode: "insensitive" } },
        { displayName: { contains: trimmedSearch, mode: "insensitive" } }
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }]
    });

    return users.map(toUserResponse);
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return toUserResponse(user);
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
        }
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
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.email !== undefined) {
      data.email = normalizeEmail(input.email);
    }
    if (input.displayName !== undefined) {
      data.displayName = input.displayName.trim();
    }
    if (input.role !== undefined) {
      data.role = input.role;
    }
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }
    if (input.temporaryPassword !== undefined) {
      data.passwordHash = await this.authService.hashPassword(input.temporaryPassword);
    }

    try {
      const user = await this.prisma.user.update({ where: { id }, data });

      if (input.role !== undefined && input.role !== existing.role) {
        await this.audit.record(actorId, "user.role_changed", {
          targetUserId: id,
          from: existing.role,
          to: input.role
        });
      }

      if (input.isActive !== undefined && input.isActive !== existing.isActive) {
        await this.audit.record(actorId, input.isActive ? "user.activated" : "user.deactivated", {
          targetUserId: id
        });
      }

      await this.audit.record(actorId, "user.updated", {
        targetUserId: id
      });

      return toUserResponse(user);
    } catch (error) {
      handleUniqueEmail(error);
    }
  }
}

type UserWithDates = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toUserResponse(user: UserWithDates) {
  return {
    ...toRequestUser(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
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

export type { CreateUserInput, UpdateUserInput };
