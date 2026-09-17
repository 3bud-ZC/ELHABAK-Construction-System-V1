import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
// Pin the login throttle low BEFORE AppModule is imported so the burst test sees 429s;
// test-database-env.ts's high default is intended for the role-matrix suites, not this one.
process.env.AUTH_LOGIN_RATE_LIMIT = "8";
process.env.STORAGE_ROOT = `.codex-sec-qa/test-storage-${Date.now()}`;

const TRUSTED_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

describe("Security hardening: origin protection, login rate limiting, uploads, system", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let projectId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const testDomain = "@sec.elhabak.local";
  const adminEmail = `admin-${suffix}${testDomain}`;
  const clientEmail = `client-${suffix}${testDomain}`;
  const password = `Test-${suffix}-Password1`;

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$queryRaw`SELECT 1`;

    const passwordHash = await hash(password, 12);
    await prisma.user.createMany({
      data: [
        { email: adminEmail, displayName: "SEC Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: clientEmail, displayName: "SEC Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: clientEmail } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const project = await prisma.project.create({
      data: {
        name: "SEC Hardening Project",
        code: `SEC-${suffix}`,
        category: "CONSTRUCTION",
        clientId: client.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 40
      }
    });
    projectId = project.id;
  });

  afterAll(async () => {
    if (!prisma || !app) return;
    try {
      await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
      await prisma.siteMedia.deleteMany({ where: { project: { code: { startsWith: "SEC-" } } } });
      await prisma.siteUpdate.deleteMany({ where: { project: { code: { startsWith: "SEC-" } } } });
      await prisma.auditLog.deleteMany({
        where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "SEC-" } } }] }
      });
      await prisma.project.deleteMany({ where: { code: { startsWith: "SEC-" } } });
      await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
      await rm(".codex-sec-qa", { recursive: true, force: true });
    } finally {
      await app.close();
    }
  });

  it("accepts a valid login and issues a hardened session cookie", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: adminEmail, password })
      .expect(200);

    adminCookie = readCookie(response);
    const setCookie = response.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=(Lax|None)/i);
    expect(response.body.user.email).toBe(adminEmail);
  });

  it("rejects unsafe requests from an untrusted Origin before auth or throttle", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: adminEmail, password })
      .expect(403);
    expect(response.headers["set-cookie"]).toBeUndefined();

    // Global guard, not an auth-controller behavior: an unauthenticated mutating call to
    // any route gets 403 (not 401) when it carries a forged origin.
    await request(app.getHttpServer())
      .patch("/admin/users/anything")
      .set("Origin", "https://evil.example")
      .send({})
      .expect(403);
  });

  it("falls back to Referer when Origin is absent", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("Referer", "https://evil.example/login")
      .send({ email: adminEmail, password })
      .expect(403);

    await request(app.getHttpServer())
      .post("/auth/login")
      .set("Referer", `${TRUSTED_ORIGIN}/login`)
      .send({ email: adminEmail, password: "wrong-password" })
      .expect(401);
  });

  it("rejects cross-site fetch metadata when no usable origin is present", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("Sec-Fetch-Site", "cross-site")
      .send({ email: adminEmail, password })
      .expect(403);
  });

  it("does not origin-check safe methods and allows non-browser clients", async () => {
    await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://evil.example")
      .expect(200);

    // No Origin/Referer/fetch-metadata: treated as a non-browser client (browsers cannot
    // produce an unsafe request with no Origin), so it reaches auth - 401 for bad creds.
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password: "wrong-password" })
      .expect(401);
  });

  it("echoes a request correlation id on success and failure", async () => {
    const ok = await request(app.getHttpServer()).get("/health").expect(200);
    expect(ok.headers["x-request-id"]).toBeTruthy();
    expect(ok.headers["x-content-type-options"]).toBe("nosniff");
    expect(ok.body.uptimeSeconds).toBeTypeOf("number");

    const failed = await request(app.getHttpServer()).get("/auth/me").expect(401);
    expect(failed.headers["x-request-id"]).toBeTruthy();
    expect(failed.body.requestId).toBeTruthy();
  });

  it("rejects oversized uploads with 413 before buffering them fully", async () => {
    // 26MB > MAX_UPLOAD_MB (25): Multer's streaming limit must fire before the file is
    // buffered into memory - previously only the post-buffer validator rejected it.
    const oversized = Buffer.alloc(26 * 1024 * 1024, 0x41);
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", adminCookie)
      .field("type", "GENERAL")
      .attach("media", oversized, { filename: "oversized.png", contentType: "image/png" });
    expect(response.status).toBe(413);
    expect(response.body.message).toMatch(/too large/i);
  });

  it("exposes storage usage to Admin only", async () => {
    await request(app.getHttpServer()).get("/admin/system/storage").expect(401);

    const response = await request(app.getHttpServer())
      .get("/admin/system/storage")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(response.body.fileCount).toBeTypeOf("number");
    expect(response.body.totalBytes).toBeTypeOf("number");
    expect(response.body.checkedAt).toBeTypeOf("string");
  });

  it("enforces the login rate limit and returns a clean 429", async () => {
    // Earlier tests consumed part of this file's 8/minute budget; a burst well above it
    // must end in 429s while earlier attempts still pass through as normal auth failures.
    const statuses: number[] = [];
    for (let index = 0; index < 14; index += 1) {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: `nobody-${index}${testDomain}`, password: "wrong" });
      statuses.push(response.status);
    }

    // Some early attempts pass through as ordinary auth failures; the tail is throttled.
    expect(statuses[statuses.length - 1]).toBe(429);
    expect(statuses.filter((status) => status === 429).length).toBeGreaterThanOrEqual(3);
    expect(statuses).not.toContain(403);
  });
});

function readCookie(response: { headers: Record<string, unknown> }): string {
  const raw = response.headers["set-cookie"];
  const setCookie = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  const session = setCookie.find((cookie) => cookie.includes("elhabak_session="));
  if (!session) throw new Error("Session cookie missing from login response.");
  return session.split(";")[0] ?? "";
}
