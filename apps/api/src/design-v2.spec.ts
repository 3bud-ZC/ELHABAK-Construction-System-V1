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
process.env.STORAGE_ROOT = ".codex-dv2-qa/test-storage";

describe("Design Hub V2 — lightweight register and review productivity", () => {
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
  let designId: string;
  let revisionOneId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@dv2.elhabak.local";
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
        { email: email("admin"), displayName: "DV2 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "DV2 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "DV2 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "DV2 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "DV2 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "DV2 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "DV2 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });
    const project = await prisma.project.create({
      data: { name: "DV2 Design Project", code: `DV2-${suffix}-A`, category: "DESIGN", clientId: client.id, engineerId: engineer.id, phase: "DESIGN", status: "ACTIVE", progress: 20 }
    });
    await prisma.project.create({
      data: { name: "DV2 Other Project", code: `DV2-${suffix}-B`, category: "DESIGN", clientId: otherClient.id, phase: "DESIGN", status: "ACTIVE", progress: 5 }
    });
    projectId = project.id;

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
    await prisma.designItem.deleteMany({ where: { project: { code: { startsWith: "DV2-" } } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "DV2-" } } }] } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "DV2-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-dv2-qa"), { recursive: true, force: true });
  });

  it("returns a lightweight register: counts + latest revision only, no history arrays", async () => {
    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs`)
      .set("Cookie", engineerCookie)
      .field("title", "DV2 Structural Frame")
      .field("discipline", "STRUCTURAL")
      .field("revisionNotes", "Initial frame issue")
      .attach("file", pdfBuffer("DV2 REV 01"), { filename: "frame-rev-01.pdf", contentType: "application/pdf" })
      .expect(201);
    designId = created.body.id;
    revisionOneId = created.body.currentRevision.id;

    const revised = await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions`)
      .set("Cookie", engineerCookie)
      .field("notes", "Second issue")
      .attach("file", pdfBuffer("DV2 REV 02"), { filename: "frame-rev-02.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(revised.body.currentRevision.revisionNumber).toBe(2);

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs`)
      .set("Cookie", adminCookie)
      .expect(200);

    const row = (list.body as Array<Record<string, unknown>>).find((item) => item.id === designId);
    expect(row).toBeTruthy();
    expect(row).not.toHaveProperty("revisions");
    expect(row).not.toHaveProperty("events");
    expect(row?.revisionCount).toBe(2);
    expect(row?.eventCount).toBeGreaterThanOrEqual(3);
    const current = row?.currentRevision as Record<string, unknown>;
    expect(current.revisionNumber).toBe(2);
    expect(current.originalFilename).toBe("frame-rev-02.pdf");
    expect((current.uploader as { displayName: string }).displayName).toBe("DV2 Engineer");
  });

  it("keeps full revision and event history on the detail endpoint", async () => {
    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs/${designId}`)
      .set("Cookie", engineerCookie)
      .expect(200);
    expect(detail.body.revisions).toHaveLength(2);
    expect(detail.body.revisions.map((r: { revisionNumber: number }) => r.revisionNumber).sort()).toEqual([1, 2]);
    expect(detail.body.events.length).toBeGreaterThanOrEqual(3);
    expect(detail.body.currentRevision.id).not.toBe(revisionOneId);
  });

  it("keeps register search and role gates working on the slim payload", async () => {
    const search = await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs?search=frame-rev-02`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0].id).toBe(designId);

    const filtered = await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs?status=APPROVED`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(filtered.body).toHaveLength(0);

    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", workerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", accountantCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", otherEngineerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/designs`).set("Cookie", otherClientCookie).expect(403);
  });

  it("enforces current-revision-only submit/review and preserves the older revision", async () => {
    // Revision 1 is DRAFT but not current — submitting it must fail.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${revisionOneId}/submit`)
      .set("Cookie", engineerCookie)
      .expect(400);

    const current = await prisma.designRevision.findFirstOrThrow({ where: { designId, revisionNumber: 2 } });
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${current.id}/submit`)
      .set("Cookie", engineerCookie)
      .expect(201);

    // Client cannot decide without a rejection reason; engineer cannot decide at all.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${current.id}/decision`)
      .set("Cookie", clientCookie)
      .send({ action: "REJECT", comment: "   " })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${current.id}/decision`)
      .set("Cookie", engineerCookie)
      .send({ action: "APPROVE" })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/designs/${designId}/revisions/${current.id}/decision`)
      .set("Cookie", clientCookie)
      .send({ action: "REJECT", comment: "Column grid needs rework." })
      .expect(201);

    // Historical revision file remains retrievable for authorized users.
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/designs/${designId}/revisions/${revisionOneId}/file`)
      .set("Cookie", adminCookie)
      .expect(200)
      .expect("Content-Type", "application/pdf");

    const persisted = await prisma.designRevision.count({ where: { designId } });
    expect(persisted).toBe(2);
  });

  async function login(emailAddress: string) {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: emailAddress, password }).expect(200);
    return readCookie(response);
  }
});

function pdfBuffer(label: string) {
  return Buffer.from(`%PDF-1.4\n${label}\n%%EOF`, "ascii");
}

function readCookie(response: Response): string {
  const cookie = response.headers["set-cookie"];
  if (!Array.isArray(cookie) || !cookie[0]) throw new Error("Expected session cookie.");
  return cookie[0] as string;
}
