import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import type { Response } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

describe("Milestone 02 auth, RBAC, users, clients", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let engineerCookie: string;
  let databaseReady = false;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `admin-${suffix}@test.elhabak.local`;
  const engineerEmail = `engineer-${suffix}@test.elhabak.local`;
  const inactiveEmail = `inactive-${suffix}@test.elhabak.local`;
  const password = `Test-${suffix}-Password1`;

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();

    prisma = app.get(PrismaService);
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch {
      throw new Error("Configured database unavailable.");
    }

    await prisma.user.createMany({
      data: [
        {
          email: adminEmail,
          displayName: "Test Admin",
          role: "ADMIN",
          isActive: true,
          passwordHash: await hash(password, 12)
        },
        {
          email: engineerEmail,
          displayName: "Test Engineer",
          role: "ENGINEER",
          isActive: true,
          passwordHash: await hash(password, 12)
        },
        {
          email: inactiveEmail,
          displayName: "Inactive User",
          role: "ADMIN",
          isActive: false,
          passwordHash: await hash(password, 12)
        }
      ]
    });
  });

  afterAll(async () => {
    if (!prisma || !app || !databaseReady) {
      return;
    }

    try {
      await prisma.authSession.deleteMany({
        where: { user: { email: { endsWith: "@test.elhabak.local" } } }
      });
      await prisma.clientProfile.deleteMany({
        where: { user: { email: { endsWith: "@test.elhabak.local" } } }
      });
      await prisma.auditLog.deleteMany({
        where: { actor: { email: { endsWith: "@test.elhabak.local" } } }
      });
      await prisma.user.deleteMany({ where: { email: { endsWith: "@test.elhabak.local" } } });
    } catch {
      throw new Error("Test cleanup failed.");
    } finally {
      await app.close();
    }
  });

  it("connects Prisma to configured database", async () => {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
    expect(result[0]?.ok).toBe(1);
  });

  it("supports valid login, current user, logout, invalid login, and inactive rejection", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password })
      .expect(200);

    adminCookie = readCookie(login);
    expect(login.body.user.email).toBe(adminEmail);
    expect(login.body.user.passwordHash).toBeUndefined();

    await request(app.getHttpServer()).get("/auth/me").set("Cookie", adminCookie).expect(200);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password: "wrong-password" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: inactiveEmail, password })
      .expect(401);

    await request(app.getHttpServer()).post("/auth/logout").set("Cookie", adminCookie).send({}).expect(200);
    await request(app.getHttpServer()).get("/auth/me").set("Cookie", adminCookie).expect(401);

    const secondLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password })
      .expect(200);
    adminCookie = readCookie(secondLogin);
  });

  it("normalizes a mobile-clipboard-contaminated email/password on login without weakening validation", async () => {
    // Invisible zero-width/bidi-control characters (LRM, RLM, an LRI/PDI pair, and a BOM)
    // that a mobile clipboard commonly embeds when text is copied out of an RTL (Arabic)
    // conversation, e.g. WhatsApp. Built from code points, not escape-sequence literals.
    const lrm = String.fromCodePoint(0x200e);
    const rlm = String.fromCodePoint(0x200f);
    const lri = String.fromCodePoint(0x2066);
    const pdi = String.fromCodePoint(0x2069);
    const bom = String.fromCodePoint(0xfeff);

    const contaminatedEmail = `${rlm}${lrm}  ${bom}${lri}${adminEmail.toUpperCase()}${pdi}${rlm}\n`;

    const contaminatedLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: contaminatedEmail, password })
      .expect(200);
    expect(contaminatedLogin.body.user.email).toBe(adminEmail);
    readCookie(contaminatedLogin);

    // Plain leading/trailing whitespace continues to work (pre-existing `.trim()` behavior).
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: `  ${adminEmail}  `, password })
      .expect(200);

    // A trailing clipboard newline after the password is stripped, but the password itself
    // is never lowercased/trimmed/altered otherwise - a genuinely wrong password (even one
    // that only differs by trailing whitespace the user actually typed) is still rejected.
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password: `${password}\n` })
      .expect(200);
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password: `${password} ` })
      .expect(401);
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: adminEmail, password: "wrong-password" })
      .expect(401);

    // An email that is invalid even after stripping/trimming is still rejected as malformed.
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: `${rlm}not-an-email${lrm}`, password })
      .expect(400);
  });

  it("enforces RBAC for anonymous, wrong role, and admin access", async () => {
    await request(app.getHttpServer()).get("/admin/users").expect(401);

    const engineerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: engineerEmail, password })
      .expect(200);
    engineerCookie = readCookie(engineerLogin);

    await request(app.getHttpServer()).get("/admin/users").set("Cookie", engineerCookie).expect(403);
    await request(app.getHttpServer()).get("/admin/users").set("Cookie", adminCookie).expect(200);
  });

  it("allows admin to create and update users, rejects duplicate email, blocks non-admin", async () => {
    const email = `created-user-${suffix}@test.elhabak.local`;
    const created = await request(app.getHttpServer())
      .post("/admin/users")
      .set("Cookie", adminCookie)
      .send({
        email,
        displayName: "Created User",
        role: "WORKER",
        isActive: true,
        temporaryPassword: password
      })
      .expect(201);

    expect(created.body.email).toBe(email);
    expect(created.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .post("/admin/users")
      .set("Cookie", adminCookie)
      .send({
        email,
        displayName: "Duplicate User",
        role: "WORKER",
        isActive: true,
        temporaryPassword: password
      })
      .expect(409);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/users/${created.body.id}`)
      .set("Cookie", adminCookie)
      .send({ displayName: "Updated User", role: "ACCOUNTANT", isActive: false })
      .expect(200);

    expect(updated.body.displayName).toBe("Updated User");
    expect(updated.body.role).toBe("ACCOUNTANT");
    expect(updated.body.isActive).toBe(false);

    await request(app.getHttpServer())
      .post("/admin/users")
      .set("Cookie", engineerCookie)
      .send({
        email: `blocked-${suffix}@test.elhabak.local`,
        displayName: "Blocked User",
        role: "WORKER",
        isActive: true,
        temporaryPassword: password
      })
      .expect(403);
  });

  it("allows admin to create, update, and list clients with linked CLIENT account", async () => {
    const email = `client-${suffix}@test.elhabak.local`;
    const created = await request(app.getHttpServer())
      .post("/admin/clients")
      .set("Cookie", adminCookie)
      .send({
        email,
        displayName: "Created Client",
        phone: "+20 100 000 0000",
        notes: "Test client only.",
        isActive: true,
        temporaryPassword: password
      })
      .expect(201);

    expect(created.body.user.role).toBe("CLIENT");
    expect(created.body.user.passwordHash).toBeUndefined();

    const clientLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password })
      .expect(200);
    expect(clientLogin.body.user.role).toBe("CLIENT");

    const updated = await request(app.getHttpServer())
      .patch(`/admin/clients/${created.body.id}`)
      .set("Cookie", adminCookie)
      .send({ displayName: "Updated Client", phone: "+20 111 111 1111", notes: "Updated." })
      .expect(200);

    expect(updated.body.user.displayName).toBe("Updated Client");
    expect(updated.body.phone).toBe("+20 111 111 1111");

    const list = await request(app.getHttpServer()).get("/admin/clients").set("Cookie", adminCookie).expect(200);
    expect(list.body.some((client: { id: string }) => client.id === created.body.id)).toBe(true);
  });
});

function readCookie(response: Response): string {
  const cookie = response.headers["set-cookie"];

  if (!Array.isArray(cookie) || !cookie[0]) {
    throw new Error("Expected session cookie.");
  }

  return cookie[0] as string;
}
