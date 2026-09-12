import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import type { UserRole } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { compare, hash } from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";

type CookieOptions = {
  name: string;
  maxAge: number;
  secure: boolean;
  sameSite: "lax" | "none";
};

@Injectable()
export class AuthService {
  private readonly env = parseApiEnv(process.env);
  private readonly dummyPasswordHash =
    "$2b$10$kBULgqmfl2JK3/jLXRfSl.c3scL9KgQK17CuBjJI7JkUpkJ81ScKq";

  constructor(private readonly prisma: PrismaService) {}

  get cookieOptions(): CookieOptions {
    const isProduction = this.env.NODE_ENV === "production";

    return {
      name: this.env.SESSION_COOKIE_NAME,
      maxAge: this.env.SESSION_EXPIRES_DAYS * 24 * 60 * 60,
      secure: isProduction,
      // The Railway deployment serves the web app and API from separate domains, so the
      // browser treats every API request as cross-site. SameSite=Lax cookies are never sent
      // on a cross-site fetch/XHR (only on top-level navigation), which would silently break
      // login. SameSite=None requires Secure, so this only applies once NODE_ENV=production
      // guarantees HTTPS; local dev (same host, different port) keeps the stricter Lax default.
      sameSite: isProduction ? "none" : "lax"
    };
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  async login(email: string, password: string): Promise<{ token: string; user: RequestUser }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordHash = user?.passwordHash ?? this.dummyPasswordHash;
    const passwordOk = await compare(password, passwordHash);

    if (!user || !user.isActive || user.archivedAt || !user.passwordHash || !passwordOk) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashSessionToken(token);
    const expiresAt = new Date(Date.now() + this.cookieOptions.maxAge * 1000);

    await this.prisma.authSession.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    return { token, user: toRequestUser(user) };
  }

  async authenticate(token: string | undefined): Promise<{ sessionId: string; user: RequestUser }> {
    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.hashSessionToken(token) },
      include: { user: true, impersonatedUser: true }
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive ||
      session.user.archivedAt ||
      (session.impersonatedUser && (!session.impersonatedUser.isActive || session.impersonatedUser.archivedAt))
    ) {
      throw new UnauthorizedException("Authentication required.");
    }

    const effectiveUser = session.impersonatedUser ?? session.user;
    return {
      sessionId: session.id,
      user: toRequestUser(
        effectiveUser,
        session.impersonatedUser
          ? { actorId: session.user.id, actorDisplayName: session.user.displayName }
          : undefined
      )
    };
  }

  async startImpersonation(sessionId: string | undefined, targetUserId: string): Promise<RequestUser> {
    if (!sessionId) throw new UnauthorizedException("Authentication required.");

    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true, impersonatedUser: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Authentication required.");
    }
    if (session.user.role !== "ADMIN" || !session.user.isActive || session.user.archivedAt) {
      throw new ForbiddenException("Only an active Admin can impersonate a user.");
    }
    if (session.impersonatedUserId) {
      throw new ConflictException("Nested impersonation is not allowed.");
    }
    if (session.userId === targetUserId) {
      throw new ConflictException("You are already signed in as this Admin.");
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException("User not found.");
    if (!target.isActive || target.archivedAt) {
      throw new ConflictException("Only an active, non-archived user can be impersonated.");
    }

    await this.prisma.$transaction([
      this.prisma.authSession.update({
        where: { id: session.id },
        data: { impersonatedUserId: target.id }
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "user.impersonation_started",
          metadata: { targetUserId: target.id, effectiveUserId: target.id }
        }
      })
    ]);

    return toRequestUser(target, {
      actorId: session.user.id,
      actorDisplayName: session.user.displayName
    });
  }

  async exitImpersonation(sessionId: string | undefined): Promise<RequestUser> {
    if (!sessionId) throw new UnauthorizedException("Authentication required.");

    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Authentication required.");
    }
    if (!session.impersonatedUserId) {
      throw new ConflictException("This session is not impersonating a user.");
    }
    if (session.user.role !== "ADMIN" || !session.user.isActive || session.user.archivedAt) {
      throw new ForbiddenException("Original Admin account is unavailable.");
    }

    const targetUserId = session.impersonatedUserId;
    await this.prisma.$transaction([
      this.prisma.authSession.update({
        where: { id: session.id },
        data: { impersonatedUserId: null }
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "user.impersonation_ended",
          metadata: { targetUserId, effectiveUserId: targetUserId }
        }
      })
    ]);

    return toRequestUser(session.user);
  }

  async revokeUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        revokedAt: null,
        OR: [{ userId }, { impersonatedUserId: userId }]
      },
      data: { revokedAt: new Date() }
    });
    return result.count;
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  private hashSessionToken(token: string): string {
    return createHmac("sha256", this.env.AUTH_SESSION_SECRET).update(token).digest("hex");
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type PersistedUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export function toRequestUser(
  user: PersistedUser,
  impersonation?: RequestUser["impersonation"]
): RequestUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    ...(impersonation ? { impersonation } : {})
  };
}
