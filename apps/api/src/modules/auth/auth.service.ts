import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import type { UserRole } from "@elhabak/database";
import { passwordPolicyIssue } from "@elhabak/validation";
import { canonicalGeneratedTemporaryPassword } from "./temporary-password";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
// bcrypt runs on a worker_threads pool so sign-in waves never block the event loop.
import { comparePassword as compare, hashPassword as bcryptHash } from "../../shared/password-hasher";
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
    return bcryptHash(password, 12);
  }

  async login(email: string, password: string): Promise<{ token: string; user: RequestUser }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const passwordHash = user?.passwordHash ?? this.dummyPasswordHash;
    let passwordOk = await compare(password, passwordHash);

    // Generated temporary credentials tolerate case/separator/invisible-mark drift from
    // being relayed over WhatsApp or retyped on a phone (see temporary-password.ts). Only
    // an input shaped exactly like a generated credential is folded, and only an account
    // still holding its temporary credential can match it; the second comparison runs
    // whenever the input has that shape, so timing does not reveal the account state.
    if (!passwordOk) {
      const canonical = canonicalGeneratedTemporaryPassword(password);
      if (canonical !== null && canonical !== password) {
        passwordOk = (await compare(canonical, passwordHash)) && Boolean(user?.mustChangePassword);
      }
    }

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

  async changePassword(user: RequestUser, sessionId: string | undefined, currentPassword: string, newPassword: string) {
    if (!sessionId) throw new UnauthorizedException("Authentication required.");
    // An Admin viewing as another user holds that user's effective identity but not their
    // credential; the account owner is the only party allowed to replace it.
    if (user.impersonation) {
      throw new ForbiddenException({ code: "PASSWORD_CHANGE_IMPERSONATION", message: "Exit user view before changing a password." });
    }
    const policyIssue = passwordPolicyIssue(newPassword, user.role === "CLIENT" ? "client" : "staff");
    if (policyIssue) {
      throw new BadRequestException({ code: "PASSWORD_POLICY", reason: policyIssue, message: "New password does not meet the password policy." });
    }

    const account = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!account?.passwordHash || !(await compare(currentPassword, account.passwordHash))) {
      // 400, not 401: the session is valid, only the re-entered secret is wrong. A 401
      // would read as "session expired" to the client and bounce the user to sign-in.
      throw new BadRequestException({ code: "CURRENT_PASSWORD_INVALID", message: "Current password is incorrect." });
    }
    if (await compare(newPassword, account.passwordHash)) {
      throw new BadRequestException({ code: "PASSWORD_POLICY", reason: "same_as_current", message: "New password must differ from the current password." });
    }

    const passwordHash = await this.hashPassword(newPassword);
    const revokedAt = new Date();
    const [, revoked] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false }
      }),
      this.prisma.authSession.updateMany({
        where: {
          id: { not: sessionId },
          revokedAt: null,
          OR: [{ userId: user.id }, { impersonatedUserId: user.id }]
        },
        data: { revokedAt }
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "user.password_changed",
          metadata: { targetUserId: user.id, wasTemporary: account.mustChangePassword }
        }
      })
    ]);
    return { ok: true as const, otherSessionsRevoked: revoked.count };
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
  mustChangePassword?: boolean;
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
    mustChangePassword: user.mustChangePassword ?? false,
    ...(impersonation ? { impersonation } : {})
  };
}
