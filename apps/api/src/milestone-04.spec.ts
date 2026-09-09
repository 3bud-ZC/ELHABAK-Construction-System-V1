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
process.env.STORAGE_ROOT = ".codex-m04-qa/test-storage";

describe("Milestone 04 Design Hub, revisions, approvals, and IDOR", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let accountantCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let projectId: string;
  let otherProjectId: string;
  let designId: string;
  let revisionOneId: string;
  let revisionTwoId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m04.elhabak.local";
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
        { email: email("admin"), displayName: "M04 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M04 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "M04 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M04 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "M04 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "M04 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M04 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const otherEngineer = await prisma.user.findUniqueOrThrow({ where: { email: email("other-engineer") } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });
    const project = await prisma.project.create({
      data: {
        name: "M04 Design Project",
        code: `M04-${suffix}-A`,
        category: "DESIGN",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "DESIGN",
        status: "ACTIVE",
        progress: 30
      }
    });
    const otherProject = await prisma.project.create({
      data: {
        name: "M04 Other Project",
        code: `M04-${suffix}-B`,
        category: "DESIGN",
        clientId: otherClient.id,
        engineerId: otherEngineer.id,
        phase: "DESIGN",
        status: "ACTIVE",
        progress: 10
      }
    });
    projectId = project.id;
    otherProjectId = otherProject.id;

    [adminCookie, engineerCookie, otherEngineerCookie, workerCookie, accountantCookie, clientCookie, otherClientCookie] = await Promise.all([
      login(email("admin")),
      login(email("engineer")),
      login(email("other-engineer")),
      login(email("worker")),
      login(email("accountant")),
      login(email("client")),
      login(email("other-client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.designEvent.deleteMany({ where: { actor: { email: { endsWith: testDomain } } } });
    await prisma.designRevision.deleteMany({ where: { uploader: { email: { endsWith: testDomain } } } });
    await prisma.designItem.deleteMany({ where: { project: { code: { startsWith: "M04-" } } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M04-" } } }] } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M04-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m04-qa"), { recursive: true, force: true });
  });

  it("enforces anonymous, role, ownership, and assignment access on direct IDs", async () => {
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).expect(401);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", otherClientCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", otherEngineerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", workerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", accountantCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", clientCookie).expect(200);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", engineerCookie).expect(200);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", adminCookie).expect(200);
  });

  it("validates real file content and allows only Admin or assigned Engineer uploads", async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs`)
      .set("Cookie", engineerCookie)
      .field("title", "Spoofed drawing")
      .field("discipline", "ARCHITECTURAL")
      .attach("file", Buffer.from("not a PDF"), { filename: "spoof.pdf", contentType: "application/pdf" })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs`)
      .set("Cookie", workerCookie)
      .field("title", "Blocked")
      .field("discipline", "ARCHITECTURAL")
      .attach("file", pdfBuffer("blocked"), { filename: "blocked.pdf", contentType: "application/pdf" })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs`)
      .set("Cookie", clientCookie)
      .field("title", "Blocked")
      .field("discipline", "ARCHITECTURAL")
      .attach("file", pdfBuffer("blocked"), { filename: "blocked.pdf", contentType: "application/pdf" })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs`)
      .set("Cookie", engineerCookie)
      .field("title", "Architectural Floor Plan")
      .field("description", "Ground floor layout")
      .field("discipline", "ARCHITECTURAL")
      .field("revisionNotes", "Initial issue")
      .field("submitForReview", "true")
      .attach("file", pdfBuffer("REV 01"), { filename: "floor-plan-rev-01.pdf", contentType: "application/pdf" })
      .expect(201);

    designId = created.body.id;
    revisionOneId = created.body.currentRevision.id;
    expect(created.body.status).toBe("IN_REVIEW");
    expect(created.body.currentRevision.revisionCode).toBe("REV 01");

    const adminCreated = await request(app.getHttpServer())
      .post(`/projects/${otherProjectId}/designs`)
      .set("Cookie", adminCookie)
      .field("title", "Admin Design")
      .field("discipline", "STRUCTURAL")
      .attach("file", pngBuffer(), { filename: "admin-design.png", contentType: "image/png" })
      .expect(201);
    expect(adminCreated.body.status).toBe("DRAFT");
  });

  it("allows owning Client decisions only and preserves approval/rejection history", async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${revisionOneId}/decision`)
      .set("Cookie", otherClientCookie)
      .send({ action: "APPROVE", comment: "Guessed ID" })
      .expect(403);

    const approved = await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${revisionOneId}/decision`)
      .set("Cookie", clientCookie)
      .send({ action: "APPROVE", comment: "Approved for construction" })
      .expect(201);
    expect(approved.body.revisions[0].status).toBe("APPROVED");

    const revised = await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions`)
      .set("Cookie", engineerCookie)
      .field("notes", "Updated dimensions")
      .field("submitForReview", "true")
      .attach("file", pdfBuffer("REV 02"), { filename: "floor-plan-rev-02.pdf", contentType: "application/pdf" })
      .expect(201);
    revisionTwoId = revised.body.currentRevision.id;
    expect(revised.body.revisions).toHaveLength(2);
    expect(revised.body.revisions.find((item: { id: string }) => item.id === revisionOneId).status).toBe("APPROVED");

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${revisionTwoId}/decision`)
      .set("Cookie", clientCookie)
      .send({ action: "REJECT", comment: "Please correct the stair dimensions." })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs/${designId}`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(detail.body.status).toBe("REJECTED");
    expect(detail.body.revisions).toHaveLength(2);
    expect(detail.body.events.some((event: { action: string; comment: string }) => event.action === "CLIENT_APPROVED" && event.comment)).toBe(true);
    expect(detail.body.events.some((event: { action: string; comment: string }) => event.action === "CLIENT_REJECTED" && event.comment)).toBe(true);
  });

  it("protects current and historical files without overwriting prior revisions", async () => {
    const oldPath = `/projects/${projectId}/designs/${designId}/revisions/${revisionOneId}/file`;
    const newPath = `/projects/${projectId}/designs/${designId}/revisions/${revisionTwoId}/file`;
    await request(app.getHttpServer()).get(oldPath).expect(401);
    await request(app.getHttpServer()).get(oldPath).set("Cookie", otherClientCookie).expect(403);
    await request(app.getHttpServer()).get(oldPath).set("Cookie", otherEngineerCookie).expect(403);
    await request(app.getHttpServer()).get(oldPath).set("Cookie", clientCookie).expect(200).expect("Content-Type", "application/pdf");
    await request(app.getHttpServer()).get(newPath).set("Cookie", adminCookie).expect(200).expect("Content-Type", "application/pdf");

    const persisted = await prisma.designRevision.findMany({ where: { designId }, orderBy: { revisionNumber: "asc" } });
    expect(persisted).toHaveLength(2);
    expect(persisted[0]?.storagePath).not.toBe(persisted[1]?.storagePath);
    expect(persisted[0]?.originalFilename).toBe("floor-plan-rev-01.pdf");
    expect(persisted[1]?.originalFilename).toBe("floor-plan-rev-02.pdf");
  });

  async function login(emailAddress: string) {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: emailAddress, password }).expect(200);
    return readCookie(response);
  }
});

function pdfBuffer(label: string) {
  return Buffer.from(`%PDF-1.4\n${label}\n%%EOF`, "ascii");
}

function pngBuffer() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

function readCookie(response: Response): string {
  const cookie = response.headers["set-cookie"];
  if (!Array.isArray(cookie) || !cookie[0]) throw new Error("Expected session cookie.");
  return cookie[0] as string;
}
