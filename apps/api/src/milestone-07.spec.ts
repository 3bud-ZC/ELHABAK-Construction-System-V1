import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-m07-qa/test-storage";

describe("Milestone 07 Documents and Secure Project Files", () => {
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

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m07.elhabak.local";
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
        { email: email("admin"), displayName: "M07 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M07 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "M07 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M07 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "M07 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "M07 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M07 Other Client", role: "CLIENT", isActive: true, passwordHash }
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
        name: "M07 Documents Project",
        code: `M07-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 20,
        assignments: { create: [{ userId: worker.id }] }
      }
    });

    const otherProject = await prisma.project.create({
      data: {
        name: "M07 Other Project",
        code: `M07-${suffix}-B`,
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
    await prisma.projectDocumentVersion.deleteMany({ where: { project: { code: { startsWith: "M07-" } } } });
    await prisma.projectDocument.deleteMany({ where: { project: { code: { startsWith: "M07-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M07-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "M07-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M07-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m07-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  const validPdf = Buffer.from("%PDF-1.4\n1 0 obj<< /Type /Catalog >>\nendobj\n%%EOF\n", "ascii");
  const validPdf2 = Buffer.from("%PDF-1.4\n1 0 obj<< /Type /Catalog /V 2 >>\nendobj\n%%EOF\n", "ascii");
  const spoofedPdf = Buffer.from("This is definitely not a real PDF file.", "ascii");
  const validDocx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const invalidDocx = Buffer.from("Not a zip container at all.", "ascii");

  it("enforces authentication and role gates on every documents endpoint", async () => {
    const server = app.getHttpServer();
    await request(server).get(`/projects/${projectId}/documents`).expect(401);

    await request(server).get(`/projects/${projectId}/documents`).set("Cookie", workerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/documents`).set("Cookie", accountantCookie).expect(403);
    await request(server).get(`/projects/${projectId}/documents`).set("Cookie", otherEngineerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/documents`).set("Cookie", otherClientCookie).expect(403);
  });

  it("grants Admin and assigned Engineer full management access and computes the file checksum correctly", async () => {
    const server = app.getHttpServer();
    const expectedChecksum = createHash("sha256").update(validPdf).digest("hex");

    const created = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T1")
      .field("title", "Site Handover Checklist")
      .field("category", "HANDOVER")
      .field("description", "Test document")
      .field("isClientVisible", "false")
      .attach("file", validPdf, { filename: "handover.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(created.body.currentVersionNumber).toBe(1);
    expect(created.body.currentVersion.checksumSha256).toBe(expectedChecksum);
    expect(created.body.currentVersion.versionCode).toBe("V01");

    await request(server).get(`/projects/${projectId}/documents`).set("Cookie", adminCookie).expect(200);
    await request(server).get(`/projects/${projectId}/documents/${created.body.id}`).set("Cookie", engineerCookie).expect(200);

    // Client cannot create documents or upload versions, even on their own project.
    await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", clientCookie)
      .field("reference", "DOC-CLIENT")
      .field("title", "Client attempt")
      .field("category", "OTHER")
      .attach("file", validPdf, { filename: "x.pdf", contentType: "application/pdf" })
      .expect(403);

    await request(server)
      .post(`/projects/${projectId}/documents/${created.body.id}/versions`)
      .set("Cookie", clientCookie)
      .attach("file", validPdf2, { filename: "x2.pdf", contentType: "application/pdf" })
      .expect(403);

    await prisma.projectDocument.delete({ where: { id: created.body.id } });
  });

  it("supports safe multi-version history without overwriting prior versions", async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T2")
      .field("title", "Versioned Contract")
      .field("category", "CONTRACT")
      .field("isClientVisible", "false")
      .attach("file", validPdf, { filename: "contract-v1.pdf", contentType: "application/pdf" })
      .expect(201);

    const v1 = created.body.currentVersion;
    expect(v1.versionCode).toBe("V01");

    const withV2 = await request(server)
      .post(`/projects/${projectId}/documents/${created.body.id}/versions`)
      .set("Cookie", engineerCookie)
      .field("note", "Signed version")
      .attach("file", validPdf2, { filename: "contract-v2.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(withV2.body.currentVersionNumber).toBe(2);
    expect(withV2.body.versions.length).toBe(2);
    const v2 = withV2.body.versions.find((item: { versionCode: string }) => item.versionCode === "V02");
    expect(v2).toBeDefined();
    expect(v2.originalFilename).toBe("contract-v2.pdf");

    // V01 must still exist, unmodified, with its own distinct storage identity - never overwritten.
    const stillV1 = withV2.body.versions.find((item: { versionCode: string }) => item.versionCode === "V01");
    expect(stillV1.originalFilename).toBe("contract-v1.pdf");
    expect(stillV1.id).toBe(v1.id);

    // Both versions remain independently retrievable to an authorized user.
    await request(server).get(`/projects/${projectId}/documents/${created.body.id}/versions/${stillV1.id}/file`).set("Cookie", adminCookie).expect(200);
    await request(server).get(`/projects/${projectId}/documents/${created.body.id}/versions/${v2.id}/file`).set("Cookie", adminCookie).expect(200);

    await prisma.projectDocumentVersion.deleteMany({ where: { documentId: created.body.id } });
    await prisma.projectDocument.delete({ where: { id: created.body.id } });
  });

  it("rejects a spoofed PDF and a corrupt Office container, but accepts a genuine ZIP-based DOCX", async () => {
    const server = app.getHttpServer();

    await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T3A")
      .field("title", "Spoofed attempt")
      .field("category", "OTHER")
      .attach("file", spoofedPdf, { filename: "fake.pdf", contentType: "application/pdf" })
      .expect(400);

    await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T3B")
      .field("title", "Corrupt office container")
      .field("category", "OTHER")
      .attach("file", invalidDocx, { filename: "fake.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
      .expect(400);

    const genuineDocx = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T3C")
      .field("title", "Genuine DOCX container")
      .field("category", "OTHER")
      .attach("file", validDocx, { filename: "real.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
      .expect(201);

    expect(genuineDocx.body.currentVersion.extension).toBe(".docx");

    await prisma.projectDocumentVersion.deleteMany({ where: { documentId: genuineDocx.body.id } });
    await prisma.projectDocument.delete({ where: { id: genuineDocx.body.id } });
  });

  it("shows Client only own, active, client-visible documents and denies hidden document/version IDs with 404", async () => {
    const server = app.getHttpServer();

    const shared = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T4A")
      .field("title", "Shared Inspection Report")
      .field("category", "REPORT")
      .field("isClientVisible", "true")
      .attach("file", validPdf, { filename: "shared.pdf", contentType: "application/pdf" })
      .expect(201);

    const hidden = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T4B")
      .field("title", "Internal Coordination Memo")
      .field("category", "CORRESPONDENCE")
      .field("isClientVisible", "false")
      .attach("file", validPdf, { filename: "hidden.pdf", contentType: "application/pdf" })
      .expect(201);

    const clientList = await request(server).get(`/projects/${projectId}/documents`).set("Cookie", clientCookie).expect(200);
    expect(clientList.body.some((doc: { id: string }) => doc.id === shared.body.id)).toBe(true);
    expect(clientList.body.some((doc: { id: string }) => doc.id === hidden.body.id)).toBe(false);

    // Direct-id enumeration of a hidden document is denied with a 404, not a distinguishable 403.
    await request(server).get(`/projects/${projectId}/documents/${hidden.body.id}`).set("Cookie", clientCookie).expect(404);
    await request(server)
      .get(`/projects/${projectId}/documents/${hidden.body.id}/versions/${hidden.body.currentVersion.id}/file`)
      .set("Cookie", clientCookie)
      .expect(404);

    // The shared document's file is genuinely reachable by the owning Client.
    await request(server)
      .get(`/projects/${projectId}/documents/${shared.body.id}/versions/${shared.body.currentVersion.id}/file`)
      .set("Cookie", clientCookie)
      .expect(200);

    // The checksum is an internal integrity aid and must never appear in the Client's own view.
    const clientView = await request(server).get(`/projects/${projectId}/documents/${shared.body.id}`).set("Cookie", clientCookie).expect(200);
    expect(clientView.body.currentVersion.checksumSha256).toBeUndefined();
    expect(shared.body.currentVersion.checksumSha256).toBeDefined();

    // Cross-project IDOR: a real document id from this project, requested under an unrelated project id, is not found.
    await request(server).get(`/projects/${otherProjectId}/documents/${shared.body.id}`).set("Cookie", otherEngineerCookie).expect(404);

    await prisma.projectDocumentVersion.deleteMany({ where: { documentId: { in: [shared.body.id, hidden.body.id] } } });
    await prisma.projectDocument.deleteMany({ where: { id: { in: [shared.body.id, hidden.body.id] } } });
  });

  it("enforces an immediate Client visibility toggle and archive/restore that preserves version history", async () => {
    const server = app.getHttpServer();

    const document = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T5")
      .field("title", "Toggle and Archive Test")
      .field("category", "REPORT")
      .field("isClientVisible", "true")
      .attach("file", validPdf, { filename: "toggle.pdf", contentType: "application/pdf" })
      .expect(201);

    await request(server).get(`/projects/${projectId}/documents/${document.body.id}`).set("Cookie", clientCookie).expect(200);

    await request(server)
      .patch(`/projects/${projectId}/documents/${document.body.id}/visibility`)
      .set("Cookie", engineerCookie)
      .send({ isClientVisible: false })
      .expect(200);

    // The hide takes effect immediately - no caching/stale-visibility window.
    await request(server).get(`/projects/${projectId}/documents/${document.body.id}`).set("Cookie", clientCookie).expect(404);

    const archived = await request(server).post(`/projects/${projectId}/documents/${document.body.id}/archive`).set("Cookie", adminCookie).expect(201);
    expect(archived.body.status).toBe("ARCHIVED");
    expect(archived.body.versions.length).toBe(1);

    await request(server).post(`/projects/${projectId}/documents/${document.body.id}/archive`).set("Cookie", adminCookie).expect(409);

    const restored = await request(server).post(`/projects/${projectId}/documents/${document.body.id}/restore`).set("Cookie", adminCookie).expect(201);
    expect(restored.body.status).toBe("ACTIVE");
    expect(restored.body.versions.length).toBe(1);

    const history = await request(server).get(`/projects/${projectId}/documents/${document.body.id}/history`).set("Cookie", adminCookie).expect(200);
    expect(history.body.some((event: { action: string }) => event.action === "documents.client_visibility_changed")).toBe(true);
    expect(history.body.some((event: { action: string }) => event.action === "documents.archived")).toBe(true);
    expect(history.body.some((event: { action: string }) => event.action === "documents.restored")).toBe(true);
    await request(server).get(`/projects/${projectId}/documents/${document.body.id}/history`).set("Cookie", clientCookie).expect(403);

    await prisma.projectDocumentVersion.deleteMany({ where: { documentId: document.body.id } });
    await prisma.projectDocument.delete({ where: { id: document.body.id } });
  });

  it("denies cross-project document access and requires authorization for protected downloads", async () => {
    const server = app.getHttpServer();

    const document = await request(server)
      .post(`/projects/${projectId}/documents`)
      .set("Cookie", engineerCookie)
      .field("reference", "DOC-T6")
      .field("title", "IDOR Test Document")
      .field("category", "OTHER")
      .attach("file", validPdf, { filename: "idor.pdf", contentType: "application/pdf" })
      .expect(201);

    await request(server).get(`/projects/${projectId}/documents/${document.body.id}/versions/${document.body.currentVersion.id}/file`).expect(401);
    await request(server)
      .get(`/projects/${projectId}/documents/${document.body.id}/versions/${document.body.currentVersion.id}/file`)
      .set("Cookie", workerCookie)
      .expect(403);
    await request(server)
      .get(`/projects/${otherProjectId}/documents/${document.body.id}/versions/${document.body.currentVersion.id}/file`)
      .set("Cookie", otherEngineerCookie)
      .expect(404);
    await request(server)
      .get(`/projects/${projectId}/documents/${document.body.id}/versions/${document.body.currentVersion.id}/file`)
      .set("Cookie", engineerCookie)
      .expect(200);

    await prisma.projectDocumentVersion.deleteMany({ where: { documentId: document.body.id } });
    await prisma.projectDocument.delete({ where: { id: document.body.id } });
  });
});
