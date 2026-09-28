import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";
import { Semaphore, SemaphoreBusyError } from "./shared/semaphore";
import { comparePassword, hashPassword } from "./shared/password-hasher";
import { SessionMaintenanceService } from "./modules/auth/session-maintenance.service";

describe("scale primitives (unit)", () => {
  it("Semaphore caps concurrency, queues within bounds and rejects beyond them", async () => {
    const semaphore = new Semaphore(2, 1, 1_000);
    let running = 0;
    let peak = 0;
    const gates: Array<() => void> = [];
    const task = () =>
      semaphore.run(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise<void>((resolve) => gates.push(resolve));
        running -= 1;
      });
    const first = task();
    const second = task();
    const third = task(); // queued
    await expect(task()).rejects.toBeInstanceOf(SemaphoreBusyError); // queue full
    await new Promise((r) => setTimeout(r, 10));
    expect(peak).toBe(2);
    expect(semaphore.queued).toBe(1);
    gates.shift()?.();
    await first;
    await new Promise((r) => setTimeout(r, 10));
    expect(running).toBe(2); // the queued task took the freed slot
    gates.splice(0).forEach((open) => open());
    await second;
    await new Promise((r) => setTimeout(r, 10));
    gates.splice(0).forEach((open) => open());
    await third;
    expect(semaphore.inUse).toBe(0);
  });

  it("Semaphore rejects a waiter that times out", async () => {
    const semaphore = new Semaphore(1, 5, 30);
    let release: () => void = () => undefined;
    const holder = semaphore.run(() => new Promise<void>((resolve) => (release = resolve)));
    await expect(semaphore.run(() => Promise.resolve())).rejects.toBeInstanceOf(SemaphoreBusyError);
    release();
    await holder;
  });

  it("bcrypt worker pool produces standard cost-12 hashes that verify, in parallel", async () => {
    const hashes = await Promise.all(["alpha-Pass-1", "beta-Pass-2", "gamma-Pass-3"].map((password) => hashPassword(password)));
    for (const value of hashes) expect(value).toMatch(/^\$2[aby]\$12\$/);
    expect(await comparePassword("alpha-Pass-1", hashes[0] as string)).toBe(true);
    expect(await comparePassword("wrong", hashes[0] as string)).toBe(false);
    // Interoperable with hashes produced directly by bcryptjs (existing rows).
    expect(await comparePassword("legacy-Pass-9", await hash("legacy-Pass-9", 12))).toBe(true);
  });
});

describe("bounded lists, paging and session hygiene (API, isolated test database)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const domain = "@scale.test.elhabak.local";
  const password = `Scale-${suffix}-Pass9`;
  const userIds: string[] = [];
  let adminCookie = "";
  let engineerCookie = "";
  let clientCookie = "";
  let projectId = "";

  async function login(email: string) {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0] as string;
  }

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await hash(password, 12);
    const make = async (name: string, role: "ADMIN" | "ENGINEER" | "WORKER", extra: { isActive?: boolean } = {}) => {
      const user = await prisma.user.create({ data: { email: `${name}-${suffix}${domain}`, displayName: `Scale ${name}`, role, passwordHash, ...extra } });
      userIds.push(user.id);
      return user;
    };
    await make("admin", "ADMIN");
    const engineer = await make("engineer", "ENGINEER");
    await make("worker-suspended", "WORKER", { isActive: false });
    const clients = [];
    for (let index = 0; index < 7; index += 1) {
      const profile = await prisma.clientProfile.create({
        data: {
          phone: index % 2 === 0 ? `+2010000000${index}` : null,
          user: { create: { email: `client-${index}-${suffix}${domain}`, displayName: `Scale Client ${index} ${suffix}`, role: "CLIENT", passwordHash, isActive: index !== 3 } }
        }
      });
      userIds.push(profile.userId);
      clients.push(profile);
    }
    const project = await prisma.project.create({ data: { name: `Scale ${suffix}`, category: "CONSTRUCTION", clientId: clients[0]?.id ?? null, engineerId: engineer.id } });
    projectId = project.id;
    // 130 site updates (every 5th internal-only) + lifecycle audit events, spread in time.
    const base = Date.now() - 200 * 60_000;
    await prisma.siteUpdate.createMany({
      data: Array.from({ length: 130 }, (_, index) => ({ projectId, authorId: engineer.id, type: index % 2 === 0 ? "PROGRESS" : "ISSUE", isClientVisible: index % 5 !== 0, note: `u${index}`, createdAt: new Date(base + index * 60_000) }))
    });
    await prisma.auditLog.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({ actorId: engineer.id, projectId, action: "project.progress_changed", metadata: { from: index, to: index + 1 }, createdAt: new Date(base + index * 90_000 + 30_000) }))
    });
    adminCookie = await login(`admin-${suffix}${domain}`);
    engineerCookie = await login(`engineer-${suffix}${domain}`);
    clientCookie = await login(`client-0-${suffix}${domain}`);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.siteUpdate.deleteMany({ where: { projectId } });
      await prisma.auditLog.deleteMany({ where: { OR: [{ projectId }, { actorId: { in: userIds } }] } });
      await prisma.project.deleteMany({ where: { id: projectId } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.clientProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  });

  it("timeline is bounded, newest first, and pages exactly with the before cursor", async () => {
    const server = app.getHttpServer();
    const first = await request(server).get(`/projects/${projectId}/timeline`).set("Cookie", engineerCookie).expect(200);
    expect(first.body).toHaveLength(100); // default page, not all 142 events
    const stamps = first.body.map((event: { timestamp: string }) => Date.parse(event.timestamp));
    expect([...stamps].sort((a, b) => b - a)).toEqual(stamps);

    const seen = new Set<string>(first.body.map((event: { id: string }) => event.id));
    let cursor = first.body[first.body.length - 1].timestamp as string;
    let pages = 1;
    for (;;) {
      const page = await request(server).get(`/projects/${projectId}/timeline?limit=25&before=${encodeURIComponent(cursor)}`).set("Cookie", engineerCookie).expect(200);
      pages += 1;
      for (const event of page.body) {
        expect(seen.has(event.id)).toBe(false);
        seen.add(event.id);
      }
      if (page.body.length < 25) break;
      cursor = page.body[page.body.length - 1].timestamp;
    }
    expect(seen.size).toBe(130 + 12);
    expect(pages).toBeGreaterThan(2);

    await request(server).get(`/projects/${projectId}/timeline?limit=5000`).set("Cookie", engineerCookie).expect(200).then((response) => expect(response.body.length).toBeLessThanOrEqual(200));
    await request(server).get(`/projects/${projectId}/timeline?before=not-a-date`).set("Cookie", engineerCookie).expect(400);
  });

  it("timeline summary counts the whole project and respects client visibility", async () => {
    const server = app.getHttpServer();
    const staff = await request(server).get(`/projects/${projectId}/timeline/summary`).set("Cookie", engineerCookie).expect(200);
    expect(staff.body.totalUpdates).toBe(130);
    expect(staff.body.byType).toEqual({ PROGRESS: 65, ISSUE: 65 });
    const client = await request(server).get(`/projects/${projectId}/timeline/summary`).set("Cookie", clientCookie).expect(200);
    expect(client.body.totalUpdates).toBe(104); // 26 internal-only updates hidden
    const clientPage = await request(server).get(`/projects/${projectId}/timeline?limit=200`).set("Cookie", clientCookie).expect(200);
    expect(clientPage.body.filter((event: { kind: string }) => event.kind === "SITE_UPDATE")).toHaveLength(104);
    await request(server).get(`/projects/${projectId}/timeline/summary`).expect(401);
  });

  it("clients register pages server-side with search, status filter and whole-table summary", async () => {
    const server = app.getHttpServer();
    const page = await request(server).get(`/admin/clients?page=1&pageSize=3&search=${suffix}`).set("Cookie", adminCookie).expect(200);
    expect(page.body.items).toHaveLength(3);
    expect(page.body.total).toBe(7);
    expect(page.body.pageSize).toBe(3);
    expect(page.body.summary.total).toBeGreaterThanOrEqual(7);
    const last = await request(server).get(`/admin/clients?page=3&pageSize=3&search=${suffix}`).set("Cookie", adminCookie).expect(200);
    expect(last.body.items).toHaveLength(1);
    const ids = new Set([...page.body.items, ...last.body.items].map((item: { id: string }) => item.id));
    expect(ids.size).toBe(4);
    const inactive = await request(server).get(`/admin/clients?page=1&search=${suffix}&status=INACTIVE`).set("Cookie", adminCookie).expect(200);
    expect(inactive.body.total).toBe(1);
    const capped = await request(server).get(`/admin/clients?page=1&pageSize=5000`).set("Cookie", adminCookie).expect(200);
    expect(capped.body.pageSize).toBe(100);
    await request(server).get(`/admin/clients?page=0`).set("Cookie", adminCookie).expect(400);
    // Legacy array contract (project-form pickers) is unchanged.
    const legacy = await request(server).get(`/admin/clients?search=${suffix}`).set("Cookie", adminCookie).expect(200);
    expect(Array.isArray(legacy.body)).toBe(true);
    await request(server).get(`/admin/clients?page=1`).set("Cookie", engineerCookie).expect(403);
  });

  it("team register pages server-side with role/status filters and validates them", async () => {
    const server = app.getHttpServer();
    const page = await request(server).get(`/admin/users?page=1&pageSize=10&search=${suffix}`).set("Cookie", adminCookie).expect(200);
    expect(page.body.total).toBe(3); // staff only; clients are managed from Clients
    expect(page.body.summary.roles).toHaveProperty("ENGINEER");
    const suspended = await request(server).get(`/admin/users?page=1&search=${suffix}&status=SUSPENDED`).set("Cookie", adminCookie).expect(200);
    expect(suspended.body.items.map((user: { email: string }) => user.email)).toEqual([`worker-suspended-${suffix}${domain}`]);
    const engineers = await request(server).get(`/admin/users?page=1&search=${suffix}&role=ENGINEER`).set("Cookie", adminCookie).expect(200);
    expect(engineers.body.total).toBe(1);
    await request(server).get(`/admin/users?page=1&role=ROOT`).set("Cookie", adminCookie).expect(400);
    await request(server).get(`/admin/users?page=1&status=GONE`).set("Cookie", adminCookie).expect(400);
    await request(server).get(`/admin/users?page=1`).set("Cookie", clientCookie).expect(403);
  });

  it("session sweep removes long-expired and long-revoked sessions only", async () => {
    const owner = userIds[0] as string;
    const old = new Date(Date.now() - 45 * 86_400_000);
    const recent = new Date(Date.now() - 2 * 86_400_000);
    const make = (tag: string, expiresAt: Date, revokedAt: Date | null) =>
      prisma.authSession.create({ data: { tokenHash: `sweep-${tag}-${suffix}`, userId: owner, expiresAt, revokedAt } });
    const expiredOld = await make("expired-old", old, null);
    const revokedOld = await make("revoked-old", new Date(Date.now() + 86_400_000), old);
    const expiredRecent = await make("expired-recent", recent, null);
    const live = await make("live", new Date(Date.now() + 86_400_000), null);
    await app.get(SessionMaintenanceService).sweep();
    const remaining = new Set((await prisma.authSession.findMany({ where: { id: { in: [expiredOld.id, revokedOld.id, expiredRecent.id, live.id] } } })).map((row) => row.id));
    expect(remaining.has(expiredOld.id)).toBe(false);
    expect(remaining.has(revokedOld.id)).toBe(false);
    expect(remaining.has(expiredRecent.id)).toBe(true);
    expect(remaining.has(live.id)).toBe(true);
  });

  it("admin diagnostics report database, process and storage health (admin only)", async () => {
    const server = app.getHttpServer();
    const diagnostics = await request(server).get("/admin/system/diagnostics").set("Cookie", adminCookie).expect(200);
    expect(diagnostics.body.database.connected).toBe(true);
    expect(diagnostics.body.process.rssBytes).toBeGreaterThan(0);
    expect(diagnostics.body.host.cpus).toBeGreaterThan(0);
    expect(diagnostics.body.storage).toHaveProperty("fileCount");
    await request(server).get("/admin/system/diagnostics").set("Cookie", engineerCookie).expect(403);
  });
});
