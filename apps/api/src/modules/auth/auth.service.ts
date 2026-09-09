import { Injectable, UnauthorizedException } from "@nestjs/common";
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
};

@Injectable()
export class AuthService {
  private readonly env = parseApiEnv(process.env);
  private readonly dummyPasswordHash =
    "$2b$10$kBULgqmfl2JK3/jLXRfSl.c3scL9KgQK17CuBjJI7JkUpkJ81ScKq";

  constructor(private readonly prisma: PrismaService) {}

  get cookieOptions(): CookieOptions {
    return {
      name: this.env.SESSION_COOKIE_NAME,
      maxAge: this.env.SESSION_EXPIRES_DAYS * 24 * 60 * 60,
      secure: this.env.NODE_ENV === "production"
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

    if (!user || !user.isActive || !user.passwordHash || !passwordOk) {
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
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
      throw new UnauthorizedException("Authentication required.");
    }

    return { sessionId: session.id, user: toRequestUser(session.user) };
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

export function toRequestUser(user: PersistedUser): RequestUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive
  };
}
