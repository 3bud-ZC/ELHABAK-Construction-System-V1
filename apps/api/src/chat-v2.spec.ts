import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";
import { RealtimeGateway } from "./modules/realtime/realtime.gateway";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-chatv2-qa/test-storage";

/**
 * Chat + Notifications V2 regression coverage:
 * - slim message payloads (no user secrets), clamped pagination, strict cursor validation
 * - read-state boundary semantics (author never unread, recipient counts, mark-read reset)
 * - realtime emit reuses the persisted REST response id (dedup source of truth)
 * - notification destination metadata (entityId) for chat/design/document events
 * - Documents V2 regression: DOCUMENT_SHARED reaches only the owning client, only when shared
 */
describe("Chat + Notifications V2", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtime: RealtimeGateway;

  let adminCookie: string;
  let engineerCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let accountantCookie: string;

  let projectId: string;
  let clientUserId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@chatv2.elhabak.local";
  const email = (role: string) => `${role}-${suffix}${testDomain}`;

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    realtime = app.get(RealtimeGateway);
    await prisma.$queryRaw`SELECT 1`;

    const passwordHash = await hash(password, 12);
    await prisma.user.createMany({
      data: [
        { email: email("admin"), displayName: "CV2 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "CV2 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "CV2 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "CV2 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "CV2 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });

    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
    clientUserId = clientUser.id;

    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });

    const project = await prisma.project.create({
      data: {
        name: "CV2 Chat Project",
        code: `CV2-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 10
      }
    });
    await prisma.project.create({
      data: {
        name: "CV2 Other Project",
        code: `CV2-${suffix}-B`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        phase: "DESIGN",
        status: "ACTIVE",
        progress: 0
      }
    });
    projectId = project.id;

    [adminCookie, engineerCookie, accountantCookie, clientCookie, otherClientCookie] = await Promise.all([
      login(email("admin")),
      login(email("engineer")),
      login(email("accountant")),
      login(email("client")),
      login(email("other-client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.notification.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.projectChatReadState.deleteMany({ where: { project: { code: { startsWith: "CV2-" } } } });
    await prisma.projectMessage.deleteMany({ where: { project: { code: { startsWith: "CV2-" } } } });
    await prisma.projectDocument.deleteMany({ where: { project: { code: { startsWith: "CV2-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "CV2-" } } }] }
    });
    await prisma.project.deleteMany({ where: { code: { startsWith: "CV2-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-chatv2-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  describe("History payload and pagination", () => {
    it("returns slim author identity only - never email, password hash, or profile internals", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "CV2 slim payload probe" })
        .expect(201);

      const list = await request(app.getHttpServer()).get(`/projects/${projectId}/messages`).set("Cookie", clientCookie).expect(200);
      const message = list.body.messages.find((m: { text: string }) => m.text === "CV2 slim payload probe");
      expect(message).toBeTruthy();
      expect(Object.keys(message.author).sort()).toEqual(["displayName", "id", "role"]);
      expect(message.voice).toBeNull();
      expect(message).not.toHaveProperty("storagePath");
      expect(message).not.toHaveProperty("storedFilename");
    });

    it("clamps limit to the 50-message ceiling and rejects malformed cursors with 400", async () => {
      const capped = await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages?limit=500`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(capped.body.messages.length).toBeLessThanOrEqual(50);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages?cursor=%%%not-a-cursor%%%`)
        .set("Cookie", adminCookie)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages?cursor=${Buffer.from("not-iso|id", "utf8").toString("base64url")}`)
        .set("Cookie", adminCookie)
        .expect(400);
    });
  });

  describe("Read state and realtime dedup", () => {
    it("keeps the author caught up, increments the recipient unread count, and resets on mark-read", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "CV2 unread boundary probe" })
        .expect(201);

      const authorState = await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages/read-state`)
        .set("Cookie", engineerCookie)
        .expect(200);
      expect(authorState.body.unreadCount).toBe(0);

      const clientState = await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages/read-state`)
        .set("Cookie", clientCookie)
        .expect(200);
      expect(clientState.body.unreadCount).toBeGreaterThan(0);
      expect(clientState.body.lastReadAt).toBeTruthy();

      const marked = await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages/read`)
        .set("Cookie", clientCookie)
        .send({})
        .expect(201);
      expect(marked.body.unreadCount).toBe(0);
    });

    it("emits chat:message with the same persisted id returned by REST (single dedup key)", async () => {
      const spy = vi.spyOn(realtime, "emitToProject");
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "CV2 dedup id probe" })
        .expect(201);

      const emit = spy.mock.calls.find((call) => call[1] === "chat:message");
      expect(emit).toBeTruthy();
      const payload = emit![2] as { message: { id: string } };
      expect(payload.message.id).toBe(created.body.id);
      spy.mockRestore();
    });
  });

  describe("Notification destinations and recipients", () => {
    it("creates CHAT_MESSAGE notifications with projectId + entityId for every participant except the actor", async () => {
      const before = await prisma.notification.findMany({ where: { userId: clientUserId, type: "CHAT_MESSAGE" } });
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "CV2 notification destination probe" })
        .expect(201);
      const after = await prisma.notification.findMany({ where: { userId: clientUserId, type: "CHAT_MESSAGE" }, orderBy: { createdAt: "desc" } });
      const created = after.find((n) => !before.some((b) => b.id === n.id));
      expect(created).toBeTruthy();
      expect(created!.projectId).toBe(projectId);
      expect(created!.entityId).toBeTruthy();
      expect(created!.body).toContain("notification destination probe");

      // Actor never receives their own message notification.
      const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
      const actorNotifs = await prisma.notification.findMany({ where: { userId: engineer.id, type: "CHAT_MESSAGE" } });
      expect(actorNotifs.every((n) => !n.title.includes("CV2 Engineer") || !n.body?.includes("notification destination probe"))).toBe(true);

      // Unrelated client never receives anything.
      const other = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });
      const foreign = await prisma.notification.count({ where: { userId: other.id } });
      expect(foreign).toBe(0);
    });

    it("Documents V2 regression: DOCUMENT_SHARED reaches the owning client only for a client-visible document", async () => {
      const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("cv2 doc notification probe")]);

      // Internal document - client gets nothing.
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/documents`)
        .set("Cookie", engineerCookie)
        .field("title", "CV2 internal doc")
        .field("category", "REPORT")
        .field("isClientVisible", "false")
        .attach("file", pdf, { filename: "cv2-internal.pdf", contentType: "application/pdf" })
        .expect(201);
      const internalNotifs = await prisma.notification.count({
        where: { userId: clientUserId, type: "DOCUMENT_SHARED", title: { contains: "CV2 internal doc" } }
      });
      expect(internalNotifs).toBe(0);

      // Client-visible document - owning client notified, entityId = document id.
      const shared = await request(app.getHttpServer())
        .post(`/projects/${projectId}/documents`)
        .set("Cookie", engineerCookie)
        .field("title", "CV2 shared doc")
        .field("category", "REPORT")
        .field("isClientVisible", "true")
        .attach("file", pdf, { filename: "cv2-shared.pdf", contentType: "application/pdf" })
        .expect(201);
      const sharedNotif = await prisma.notification.findFirst({
        where: { userId: clientUserId, type: "DOCUMENT_SHARED", title: { contains: "CV2 shared doc" } }
      });
      expect(sharedNotif).toBeTruthy();
      expect(sharedNotif!.entityId).toBe(shared.body.id);
      expect(sharedNotif!.projectId).toBe(projectId);
    });
  });

  describe("Voice endpoint security", () => {
    it("denies Accountant and unrelated Client on voice streaming and rejects spoofed audio", async () => {
      const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from("cv2-voice-payload")]);
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "3")
        .attach("file", webm, { filename: "note.webm", contentType: "audio/webm" })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages/${created.body.id}/voice`)
        .set("Cookie", accountantCookie)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/messages/${created.body.id}/voice`)
        .set("Cookie", otherClientCookie)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "3")
        .attach("file", Buffer.from("definitely-not-a-webm"), { filename: "fake.webm", contentType: "audio/webm" })
        .expect(400);
    });
  });
});
