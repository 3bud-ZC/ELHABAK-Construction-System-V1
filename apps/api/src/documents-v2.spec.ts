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
process.env.STORAGE_ROOT = ".codex-docv2-qa/test-storage";

describe("Documents V2 — lightweight register and document-control productivity", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let clientCookie: string;
  let projectId: string;
  let documentId: string;
  let versionOneId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@docv2.elhabak.local";
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
        { email: email("admin"), displayName: "DOCV2 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "DOCV2 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "DOCV2 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "DOCV2 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "DOCV2 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "DOCV2 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "DOCV2 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });
    const project = await prisma.project.create({
      data: { name: "DOCV2 Document Project", code: `DOCV2-${suffix}-A`, category: "CONSTRUCTION", clientId: client.id, engineerId: engineer.id, phase: "EXECUTION", status: "ACTIVE", progress: 40 }
    });
    await prisma.project.create({
      data: { name: "DOCV2 Other Project", code: `DOCV2-${suffix}-B`, category: "CONSTRUCTION", clientId: otherClient.id, phase: "EXECUTION", status: "ACTIVE", progress: 10 }
    });
    projectId = project.id;

    [adminCookie, engineerCookie, otherEngineerCookie, workerCookie, clientCookie] = await Promise.all([
      login(email("admin")),
      login(email("engineer")),
      login(email("other-engineer")),
      login(email("worker")),
      login(email("client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.notification.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.projectDocumentVersion.deleteMany({ where: { uploadedBy: { email: { endsWith: testDomain } } } });
    await prisma.projectDocument.deleteMany({ where: { project: { code: { startsWith: "DOCV2-" } } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "DOCV2-" } } }] } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "DOCV2-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-docv2-qa"), { recursive: true, force: true });
  });

  it("returns a lightweight register: version count + latest version only, no history array", async () => {
    const shared = await request(app.getHttpServer())
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("title", "DOCV2 Contract Agreement")
      .field("category", "CONTRACT")
      .field("isClientVisible", "true")
      .field("versionNote", "Initial signed draft")
      .attach("file", pdfBuffer("DOCV2 V1"), { filename: "contract-v1.pdf", contentType: "application/pdf" })
      .expect(201);
    documentId = shared.body.id;
    versionOneId = shared.body.currentVersion.id;

    const revised = await request(app.getHttpServer())
      .post(`/projects/${projectId}/documents/${documentId}/versions`)
      .set("Cookie", engineerCookie)
      .field("note", "Countersigned")
      .attach("file", pdfBuffer("DOCV2 V2"), { filename: "contract-v2.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(revised.body.currentVersion.versionNumber).toBe(2);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("title", "DOCV2 Internal Memo")
      .field("category", "REPORT")
      .field("isClientVisible", "false")
      .attach("file", pdfBuffer("DOCV2 MEMO"), { filename: "internal-memo.pdf", contentType: "application/pdf" })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents`)
      .set("Cookie", adminCookie)
      .expect(200);

    const row = (list.body as Array<Record<string, unknown>>).find((item) => item.id === documentId);
    expect(row).toBeTruthy();
    expect(row).not.toHaveProperty("versions");
    expect(row?.versionCount).toBe(2);
    const current = row?.currentVersion as Record<string, unknown>;
    expect(current.versionCode).toBe("V02");
    expect(current.originalFilename).toBe("contract-v2.pdf");
    expect((current.uploadedBy as { displayName: string }).displayName).toBe("DOCV2 Engineer");
    expect(current.checksumSha256).toBeDefined();
  });

  it("keeps full immutable version history on the detail endpoint", async () => {
    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents/${documentId}`)
      .set("Cookie", engineerCookie)
      .expect(200);
    expect(detail.body.versions).toHaveLength(2);
    expect(detail.body.versions.map((v: { versionNumber: number }) => v.versionNumber).sort()).toEqual([1, 2]);
    expect(detail.body.versions[1].note).toBe("Initial signed draft");
    expect(detail.body.currentVersion.id).not.toBe(versionOneId);
  });

  it("supports the visibility filter and keeps register search/role gates on the slim payload", async () => {
    const sharedList = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents?visibility=shared`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(sharedList.body).toHaveLength(1);
    expect(sharedList.body[0].id).toBe(documentId);

    const internalList = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents?visibility=internal`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(internalList.body).toHaveLength(1);
    expect(internalList.body[0].title).toBe("DOCV2 Internal Memo");

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents?visibility=bogus`)
      .set("Cookie", adminCookie)
      .expect(400);

    // Filename search still works through the bounded include.
    const search = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents?search=contract-v2`)
      .set("Cookie", engineerCookie)
      .expect(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0].id).toBe(documentId);

    // Client list is slim too and only carries shared ACTIVE documents.
    const clientList = await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(clientList.body).toHaveLength(1);
    expect(clientList.body[0]).not.toHaveProperty("versions");
    expect(clientList.body[0].currentVersion.checksumSha256).toBeUndefined();

    await request(app.getHttpServer()).get(`/projects/${projectId}/documents`).set("Cookie", workerCookie).expect(403);
    await request(app.getHttpServer()).get(`/projects/${projectId}/documents`).set("Cookie", otherEngineerCookie).expect(403);
  });

  it("preserves prior versions and files after a new upload (immutability)", async () => {
    // V01 file remains retrievable to authorized users after V02 became current.
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/documents/${documentId}/versions/${versionOneId}/file`)
      .set("Cookie", adminCookie)
      .expect(200)
      .expect("Content-Type", "application/pdf");

    const v1 = await prisma.projectDocumentVersion.findFirstOrThrow({ where: { documentId, versionNumber: 1 } });
    expect(v1.originalFilename).toBe("contract-v1.pdf");
    expect(v1.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    const persisted = await prisma.projectDocumentVersion.count({ where: { documentId } });
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
