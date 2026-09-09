import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import type { Response } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-m03-qa/test-storage";

describe("Milestone 03 projects, lifecycle, worker/client flow", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let engineerCookie: string;
  let workerCookie: string;
  let otherWorkerCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let projectId: string;
  let otherProjectId: string;
  let mediaId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m03.elhabak.local";
  const email = (role: string) => `${role}-${suffix}${testDomain}`;

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
        { email: email("admin"), displayName: "M03 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M03 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M03 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("other-worker"), displayName: "M03 Other Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("client"), displayName: "M03 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M03 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });

    await prisma.clientProfile.create({ data: { user: { connect: { email: email("client") } }, phone: "+20 100 000 0001" } });
    await prisma.clientProfile.create({ data: { user: { connect: { email: email("other-client") } }, phone: "+20 100 000 0002" } });

    adminCookie = await login(email("admin"));
    engineerCookie = await login(email("engineer"));
    workerCookie = await login(email("worker"));
    otherWorkerCookie = await login(email("other-worker"));
    clientCookie = await login(email("client"));
    otherClientCookie = await login(email("other-client"));
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.siteMedia.deleteMany({
      where: { OR: [{ project: { code: { startsWith: "M03-" } } }, { uploader: { email: { endsWith: testDomain } } }] }
    });
    await prisma.siteUpdate.deleteMany({
      where: { OR: [{ project: { code: { startsWith: "M03-" } } }, { author: { email: { endsWith: testDomain } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "M03-" } } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M03-" } } }] } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M03-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m03-qa"), { recursive: true, force: true });
  });

  it("allows Admin to create, update, and list projects while rejecting bad progress and role assignments", async () => {
    const client = await prisma.clientProfile.findFirstOrThrow({ where: { user: { email: email("client") } } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const worker = await prisma.user.findUniqueOrThrow({ where: { email: email("worker") } });

    const created = await request(app.getHttpServer())
      .post("/admin/projects")
      .set("Cookie", adminCookie)
      .send({
        name: "M03 Test Project",
        code: `M03-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        workerIds: [worker.id],
        location: "Sohag test location",
        startDate: "2026-09-09",
        targetDate: "2026-10-09",
        phase: "SITE_INSPECTION",
        progress: 10,
        status: "ACTIVE",
        notes: "M03 test only."
      })
      .expect(201);

    projectId = created.body.id;
    expect(created.body.engineer.id).toBe(engineer.id);
    expect(created.body.workers[0].id).toBe(worker.id);

    await request(app.getHttpServer())
      .post("/admin/projects")
      .set("Cookie", adminCookie)
      .send({ ...created.body, code: `M03-${suffix}-BAD`, clientId: client.id, engineerId: engineer.id, workerIds: [engineer.id], progress: 10 })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/admin/projects/${projectId}`)
      .set("Cookie", adminCookie)
      .send({ progress: 101 })
      .expect(400);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/projects/${projectId}`)
      .set("Cookie", adminCookie)
      .send({ phase: "EXECUTION", progress: 45, status: "ACTIVE" })
      .expect(200);

    expect(updated.body.phase).toBe("EXECUTION");
    expect(updated.body.progress).toBe(45);
    const list = await request(app.getHttpServer()).get("/admin/projects").set("Cookie", adminCookie).expect(200);
    expect(list.body.some((item: { id: string }) => item.id === projectId)).toBe(true);
  });

  it("blocks anonymous and guessed project access across roles", async () => {
    const otherClient = await prisma.clientProfile.findFirstOrThrow({ where: { user: { email: email("other-client") } } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const otherWorker = await prisma.user.findUniqueOrThrow({ where: { email: email("other-worker") } });
    const other = await prisma.project.create({
      data: {
        name: "M03 Other Project",
        code: `M03-${suffix}-B`,
        category: "DESIGN",
        clientId: otherClient.id,
        engineerId: engineer.id,
        status: "ACTIVE",
        progress: 5,
        assignments: { create: [{ userId: otherWorker.id }] }
      }
    });
    otherProjectId = other.id;

    await request(app.getHttpServer()).get("/projects").expect(401);
    await request(app.getHttpServer()).get(`/projects/${otherProjectId}`).set("Cookie", workerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}`).set("Cookie", otherWorkerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${otherProjectId}`).set("Cookie", clientCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}`).set("Cookie", engineerCookie).expect(200);
  });

  it("allows assigned Worker upload and persists site media metadata", async () => {
    const list = await request(app.getHttpServer()).get("/projects").set("Cookie", workerCookie).expect(200);
    expect(list.body.some((item: { id: string }) => item.id === projectId)).toBe(true);

    const update = await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", workerCookie)
      .field("note", "Worker test update")
      .attach("media", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), { filename: "site-test.png", contentType: "image/png" })
      .expect(201);

    expect(update.body.media[0].id).toBeTruthy();
    mediaId = update.body.media[0].id;
    const persisted = await prisma.siteMedia.findUnique({ where: { id: mediaId } });
    expect(persisted?.storagePath).toContain(projectId);
    expect(persisted?.mediaType).toBe("IMAGE");
  });

  it("allows owning Client to view own project/update and blocks other Client", async () => {
    const ownList = await request(app.getHttpServer()).get("/projects").set("Cookie", clientCookie).expect(200);
    expect(ownList.body.some((item: { id: string }) => item.id === projectId)).toBe(true);

    const ownProject = await request(app.getHttpServer()).get(`/projects/${projectId}`).set("Cookie", clientCookie).expect(200);
    expect(ownProject.body.siteUpdates.some((update: { media: unknown[] }) => update.media.length > 0)).toBe(true);
    await request(app.getHttpServer()).get(`/projects/${projectId}`).set("Cookie", otherClientCookie).expect(403);
  });

  it("enforces media authorization and blocks raw/public guessing", async () => {
    await request(app.getHttpServer()).get(`/projects/${projectId}/media/${mediaId}`).expect(401);
    await request(app.getHttpServer()).get(`/projects/${projectId}/media/${mediaId}`).set("Cookie", otherClientCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/media/${mediaId}`).set("Cookie", otherWorkerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/media/${mediaId}`).set("Cookie", clientCookie).expect(200);
    await request(app.getHttpServer()).get(`/projects/${projectId}/media/${mediaId}`).set("Cookie", adminCookie).expect(200);
    await request(app.getHttpServer()).get(`/storage/projects/${projectId}/site-updates/guessed.png`).expect(404);
  });

  async function login(emailAddress: string) {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emailAddress, password })
      .expect(200);
    return readCookie(response);
  }
});

function readCookie(response: Response): string {
  const cookie = response.headers["set-cookie"];
  if (!Array.isArray(cookie) || !cookie[0]) {
    throw new Error("Expected session cookie.");
  }
  return cookie[0] as string;
}
