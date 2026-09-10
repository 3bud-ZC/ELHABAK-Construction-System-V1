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
process.env.STORAGE_ROOT = ".codex-m05-qa/test-storage";

describe("Milestone 05 Site Operations, Progress & Phase Management, and Timeline", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let otherWorkerCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let projectId: string;
  let otherProjectId: string;
  let internalMediaId: string;
  let publicMediaId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m05.elhabak.local";
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
        { email: email("admin"), displayName: "M05 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M05 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "M05 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M05 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("other-worker"), displayName: "M05 Other Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("client"), displayName: "M05 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M05 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });

    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const otherEngineer = await prisma.user.findUniqueOrThrow({ where: { email: email("other-engineer") } });
    const worker = await prisma.user.findUniqueOrThrow({ where: { email: email("worker") } });

    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });

    const project = await prisma.project.create({
      data: {
        name: "M05 Site Operations Project",
        code: `M05-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "SITE_INSPECTION",
        status: "ACTIVE",
        progress: 10,
        assignments: {
          create: [{ userId: worker.id }]
        }
      }
    });

    const otherProject = await prisma.project.create({
      data: {
        name: "M05 Other Project",
        code: `M05-${suffix}-B`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        engineerId: otherEngineer.id,
        phase: "SITE_INSPECTION",
        status: "ACTIVE",
        progress: 0
      }
    });

    projectId = project.id;
    otherProjectId = otherProject.id;

    [adminCookie, engineerCookie, otherEngineerCookie, workerCookie, otherWorkerCookie, clientCookie, otherClientCookie] =
      await Promise.all([
        login(email("admin")),
        login(email("engineer")),
        login(email("other-engineer")),
        login(email("worker")),
        login(email("other-worker")),
        login(email("client")),
        login(email("other-client"))
      ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.siteMedia.deleteMany({ where: { project: { code: { startsWith: "M05-" } } } });
    await prisma.siteUpdate.deleteMany({ where: { project: { code: { startsWith: "M05-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M05-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "M05-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M05-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m05-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: userEmail, password })
      .expect(200);
    const setCookie = response.headers["set-cookie"];

    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  function fakeImageBuffer(): Buffer {
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);
  }

  it("enforces authentication on all site operations endpoints", async () => {
    await request(app.getHttpServer()).get(`/projects/${projectId}/timeline`).expect(401);
    await request(app.getHttpServer()).patch(`/projects/${projectId}/progress`).send({ progress: 50 }).expect(401);
    await request(app.getHttpServer()).patch(`/projects/${projectId}/phase`).send({ phase: "EXECUTION" }).expect(401);
    await request(app.getHttpServer()).post(`/projects/${projectId}/site-updates`).expect(401);
  });

  it("authorizes only Admin and assigned Engineer for progress updates with 0-100 validation", async () => {
    // Client cannot update progress
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", clientCookie)
      .send({ progress: 50 })
      .expect(403);

    // Worker cannot update progress
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", workerCookie)
      .send({ progress: 50 })
      .expect(403);

    // Unassigned Engineer cannot update progress
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", otherEngineerCookie)
      .send({ progress: 50 })
      .expect(403);

    // Validation: progress < 0 rejected
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", engineerCookie)
      .send({ progress: -5 })
      .expect(400);

    // Validation: progress > 100 rejected
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", engineerCookie)
      .send({ progress: 101 })
      .expect(400);

    // Assigned Engineer allowed to update progress
    const engRes = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", engineerCookie)
      .send({ progress: 40, note: "Foundation completed" })
      .expect(200);

    expect(engRes.body.progress).toBe(40);

    // Admin allowed to update progress
    const adminRes = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/progress`)
      .set("Cookie", adminCookie)
      .send({ progress: 60, note: "Structural framing approved" })
      .expect(200);

    expect(adminRes.body.progress).toBe(60);

    // Verify audit log exists
    const logs = await prisma.auditLog.findMany({
      where: { projectId, action: "project.progress_changed" },
      orderBy: { createdAt: "desc" }
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("authorizes only Admin and assigned Engineer for phase updates with enum validation", async () => {
    // Client cannot update phase
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", clientCookie)
      .send({ phase: "EXECUTION" })
      .expect(403);

    // Worker cannot update phase
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", workerCookie)
      .send({ phase: "EXECUTION" })
      .expect(403);

    // Unassigned Engineer cannot update phase
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", otherEngineerCookie)
      .send({ phase: "EXECUTION" })
      .expect(403);

    // Invalid phase enum rejected
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", engineerCookie)
      .send({ phase: "NOT_A_PHASE" })
      .expect(400);

    // Assigned Engineer updates phase
    const res = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", engineerCookie)
      .send({ phase: "EXECUTION", note: "Entering physical construction" })
      .expect(200);

    expect(res.body.phase).toBe("EXECUTION");

    // Admin updates phase
    const adminRes = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/phase`)
      .set("Cookie", adminCookie)
      .send({ phase: "INITIAL_HANDOVER", note: "Handover inspection ready" })
      .expect(200);

    expect(adminRes.body.phase).toBe("INITIAL_HANDOVER");

    // Verify audit log
    const logs = await prisma.auditLog.findMany({
      where: { projectId, action: "project.phase_changed" }
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("allows Worker and Engineer to submit site updates with media, enforces required files and role limits", async () => {
    // Client cannot submit site updates
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", clientCookie)
      .field("note", "Client attempting update")
      .attach("media", fakeImageBuffer(), { filename: "test.png", contentType: "image/png" })
      .expect(403);

    // Unassigned worker cannot submit site update
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", otherWorkerCookie)
      .field("note", "Unassigned worker")
      .attach("media", fakeImageBuffer(), { filename: "test.png", contentType: "image/png" })
      .expect(403);

    // Missing media file rejected
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", workerCookie)
      .field("note", "No media attached")
      .expect(400);

    // Assigned worker submits site update with type PROGRESS
    const workerRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", workerCookie)
      .field("note", "Daily bricklaying completed")
      .field("type", "PROGRESS")
      .attach("media", fakeImageBuffer(), { filename: "worker_progress.png", contentType: "image/png" })
      .expect(201);

    expect(workerRes.body.type).toBe("PROGRESS");
    expect(workerRes.body.media.length).toBe(1);
    publicMediaId = workerRes.body.media[0].id;

    // Worker attempting progressImpact should NOT change project progress
    const projectBefore = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", workerCookie)
      .field("note", "Worker attempt progress change")
      .field("type", "PROGRESS")
      .field("progressImpact", "99")
      .attach("media", fakeImageBuffer(), { filename: "worker_attempt.png", contentType: "image/png" })
      .expect(201);

    const projectAfterWorker = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(projectAfterWorker.progress).toBe(projectBefore.progress);

    // Assigned Engineer submitting with progressImpact DOES update project progress
    const engineerRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", engineerCookie)
      .field("note", "Quality inspection passed, progress updated")
      .field("type", "INSPECTION")
      .field("progressImpact", "85")
      .attach("media", fakeImageBuffer(), { filename: "inspection.png", contentType: "image/png" })
      .expect(201);

    expect(engineerRes.body.type).toBe("INSPECTION");
    expect(engineerRes.body.progressImpact).toBe(85);

    const projectAfterEngineer = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(projectAfterEngineer.progress).toBe(85);
  });

  it("protects internal updates from Client and prevents IDOR on private site media", async () => {
    // Admin creates an internal site update (isClientVisible = false)
    const internalRes = await request(app.getHttpServer())
      .post(`/projects/${projectId}/site-updates`)
      .set("Cookie", adminCookie)
      .field("note", "Internal structural warning for engineering team only")
      .field("type", "ISSUE")
      .field("isClientVisible", "false")
      .attach("media", fakeImageBuffer(), { filename: "internal_crack.png", contentType: "image/png" })
      .expect(201);

    expect(internalRes.body.isClientVisible).toBe(false);
    internalMediaId = internalRes.body.media[0].id;

    // Admin can see the internal update in project details
    const adminProj = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set("Cookie", adminCookie)
      .expect(200);

    const adminHasInternal = adminProj.body.siteUpdates.some((u: { id: string }) => u.id === internalRes.body.id);
    expect(adminHasInternal).toBe(true);

    // Client viewing project does NOT see the internal update
    const clientProj = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set("Cookie", clientCookie)
      .expect(200);

    const clientHasInternal = clientProj.body.siteUpdates.some((u: { id: string }) => u.id === internalRes.body.id);
    expect(clientHasInternal).toBe(false);

    // Client can access public media
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/media/${publicMediaId}`)
      .set("Cookie", clientCookie)
      .expect(200);

    // Client attempting direct IDOR on internal media receives 404
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/media/${internalMediaId}`)
      .set("Cookie", clientCookie)
      .expect(404);

    // Admin CAN access the internal media
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/media/${internalMediaId}`)
      .set("Cookie", adminCookie)
      .expect(200);

    // Other Client from another project cannot access media from Project A
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/media/${publicMediaId}`)
      .set("Cookie", otherClientCookie)
      .expect(403);

    // Cross-project mismatch with wrong projectId returns 404
    await request(app.getHttpServer())
      .get(`/projects/${otherProjectId}/media/${publicMediaId}`)
      .set("Cookie", clientCookie)
      .expect(404);
  });


  it("provides a chronological timeline merging site updates and audit logs with type filtering", async () => {
    // Admin gets full timeline
    const timelineRes = await request(app.getHttpServer())
      .get(`/projects/${projectId}/timeline`)
      .set("Cookie", adminCookie)
      .expect(200);

    expect(Array.isArray(timelineRes.body)).toBe(true);
    expect(timelineRes.body.length).toBeGreaterThanOrEqual(4);

    // Check chronological order (descending)
    for (let i = 0; i < timelineRes.body.length - 1; i++) {
      const current = new Date(timelineRes.body[i].timestamp).getTime();
      const next = new Date(timelineRes.body[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }

    // Client timeline excludes internal updates
    const clientTimeline = await request(app.getHttpServer())
      .get(`/projects/${projectId}/timeline`)
      .set("Cookie", clientCookie)
      .expect(200);

    const clientSeesInternal = clientTimeline.body.some(
      (e: { isClientVisible?: boolean }) => e.isClientVisible === false
    );
    expect(clientSeesInternal).toBe(false);

    // Filter timeline by type=INSPECTION
    const inspectionTimeline = await request(app.getHttpServer())
      .get(`/projects/${projectId}/timeline?type=INSPECTION`)
      .set("Cookie", engineerCookie)
      .expect(200);

    for (const event of inspectionTimeline.body) {
      if (event.kind === "SITE_UPDATE") {
        expect(event.type).toBe("INSPECTION");
      }
    }
  });
});
