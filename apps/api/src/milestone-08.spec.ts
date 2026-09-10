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
import { RealtimeGateway } from "./modules/realtime/realtime.gateway";
import type { RequestUser } from "./shared/http.types";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-m08-qa/test-storage";

describe("Milestone 08 Project Communication & Realtime Collaboration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realtime: RealtimeGateway;

  let adminCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let otherWorkerCookie: string;
  let accountantCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;

  let adminUser: RequestUser;
  let engineerUser: RequestUser;
  let clientUser: RequestUser;
  let otherClientUser: RequestUser;

  let projectId: string;
  let otherProjectId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m08.elhabak.local";
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
        { email: email("admin"), displayName: "M08 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M08 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "M08 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M08 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("other-worker"), displayName: "M08 Other Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "M08 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "M08 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M08 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: email("admin") } });
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const otherEngineer = await prisma.user.findUniqueOrThrow({ where: { email: email("other-engineer") } });
    const worker = await prisma.user.findUniqueOrThrow({ where: { email: email("worker") } });
    const otherWorker = await prisma.user.findUniqueOrThrow({ where: { email: email("other-worker") } });
    const clientUserRow = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const otherClientUserRow = await prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } });

    const client = await prisma.clientProfile.create({ data: { userId: clientUserRow.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUserRow.id } });

    const project = await prisma.project.create({
      data: {
        name: "M08 Chat Project",
        code: `M08-${suffix}-A`,
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
        name: "M08 Other Project",
        code: `M08-${suffix}-B`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        engineerId: otherEngineer.id,
        phase: "SITE_INSPECTION",
        status: "ACTIVE",
        progress: 0,
        assignments: { create: [{ userId: otherWorker.id }] }
      }
    });

    projectId = project.id;
    otherProjectId = otherProject.id;

    adminUser = toRequestUser(admin);
    engineerUser = toRequestUser(engineer);
    clientUser = toRequestUser(clientUserRow);
    otherClientUser = toRequestUser(otherClientUserRow);

    [adminCookie, engineerCookie, otherEngineerCookie, workerCookie, otherWorkerCookie, accountantCookie, clientCookie, otherClientCookie] =
      await Promise.all([
        login(email("admin")),
        login(email("engineer")),
        login(email("other-engineer")),
        login(email("worker")),
        login(email("other-worker")),
        login(email("accountant")),
        login(email("client")),
        login(email("other-client"))
      ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.notification.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.projectChatReadState.deleteMany({ where: { project: { code: { startsWith: "M08-" } } } });
    await prisma.projectMessage.deleteMany({ where: { project: { code: { startsWith: "M08-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M08-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "M08-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M08-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m08-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  function toRequestUser(user: { id: string; email: string; displayName: string; role: RequestUser["role"]; isActive: boolean }): RequestUser {
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, isActive: user.isActive };
  }

  const validWebm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from("fake-but-signed-webm-audio-payload")]);
  const spoofedWebm = Buffer.from("this is not a real webm audio container", "ascii");

  // ---------------------------------------------------------------------
  // AUTH / IDOR
  // ---------------------------------------------------------------------
  describe("Authorization and IDOR", () => {
    it("denies anonymous access", async () => {
      await request(app.getHttpServer()).get(`/projects/${projectId}/messages`).expect(401);
    });

    it("denies Accountant, unrelated Engineer, unrelated Worker, and unrelated Client", async () => {
      const server = app.getHttpServer();
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", accountantCookie).expect(403);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", otherEngineerCookie).expect(403);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", otherWorkerCookie).expect(403);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", otherClientCookie).expect(403);
    });

    it("allows Admin, assigned Engineer, assigned Worker, and owning Client", async () => {
      const server = app.getHttpServer();
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", adminCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", engineerCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", workerCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages`).set("Cookie", clientCookie).expect(200);
    });
  });

  // ---------------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------------
  describe("Text messages, validation, and pagination", () => {
    it("persists an authorized text message sent as plain JSON and rejects whitespace-only and oversized text", async () => {
      const server = app.getHttpServer();

      const created = await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "Foundation works are progressing on schedule." })
        .expect(201);
      expect(created.body.type).toBe("TEXT");
      expect(created.body.text).toBe("Foundation works are progressing on schedule.");
      expect(created.body.author.id).toBe(engineerUser.id);

      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "   " })
        .expect(400);

      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "x".repeat(2001) })
        .expect(400);
    });

    it("paginates history with a deterministic cursor and preserves chronological ordering", async () => {
      const server = app.getHttpServer();
      const texts = ["Pagination message one", "Pagination message two", "Pagination message three"];
      for (const text of texts) {
        await request(server).post(`/projects/${projectId}/messages`).set("Cookie", adminCookie).send({ type: "TEXT", text }).expect(201);
      }

      const firstPage = await request(server).get(`/projects/${projectId}/messages?limit=2`).set("Cookie", adminCookie).expect(200);
      expect(firstPage.body.messages.length).toBe(2);
      expect(firstPage.body.nextCursor).toBeTruthy();

      const createdAtTimes = firstPage.body.messages.map((m: { createdAt: string }) => new Date(m.createdAt).getTime());
      expect(createdAtTimes[0]).toBeLessThanOrEqual(createdAtTimes[1]);

      const secondPage = await request(server)
        .get(`/projects/${projectId}/messages?limit=2&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(secondPage.body.messages.length).toBeGreaterThan(0);

      const secondPageIds = new Set(secondPage.body.messages.map((m: { id: string }) => m.id));
      const firstPageIds = new Set(firstPage.body.messages.map((m: { id: string }) => m.id));
      for (const id of secondPageIds) expect(firstPageIds.has(id)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // VOICE
  // ---------------------------------------------------------------------
  describe("Voice notes", () => {
    it("persists an authorized voice note upload and rejects spoofed or oversized audio", async () => {
      const server = app.getHttpServer();

      const created = await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", workerCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "8")
        .attach("file", validWebm, { filename: "voice-note.webm", contentType: "audio/webm" })
        .expect(201);
      expect(created.body.type).toBe("VOICE");
      expect(created.body.voice.durationSeconds).toBe(8);
      const voiceMessageId = created.body.id;

      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", workerCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "5")
        .attach("file", spoofedWebm, { filename: "spoofed.webm", contentType: "audio/webm" })
        .expect(400);

      const oversized = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(20 * 1024 * 1024 + 1, 1)]);
      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", workerCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "5")
        .attach("file", oversized, { filename: "oversized.webm", contentType: "audio/webm" })
        .expect(400);

      return voiceMessageId;
    });

    it("protects voice playback: authorized roles allowed, unrelated/anonymous denied, cross-project id not found", async () => {
      const server = app.getHttpServer();

      const created = await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", clientCookie)
        .field("type", "VOICE")
        .field("durationSeconds", "12")
        .attach("file", validWebm, { filename: "voice-note.webm", contentType: "audio/webm" })
        .expect(201);
      const messageId = created.body.id;

      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).expect(401);
      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", otherClientCookie).expect(403);
      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", accountantCookie).expect(403);

      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", adminCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", engineerCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", workerCookie).expect(200);
      await request(server).get(`/projects/${projectId}/messages/${messageId}/voice`).set("Cookie", clientCookie).expect(200);

      // Cross-project IDOR: a real voice message id from this project, requested under an unrelated project id.
      await request(server).get(`/projects/${otherProjectId}/messages/${messageId}/voice`).set("Cookie", otherEngineerCookie).expect(404);
    });
  });

  // ---------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------
  describe("Notifications", () => {
    it("notifies the right recipients, never the actor, and leaves unrelated users untouched", async () => {
      const server = app.getHttpServer();

      const [adminBefore, engineerBefore, workerBefore, clientBefore, otherClientBefore] = await Promise.all([
        request(server).get("/notifications/unread-count").set("Cookie", adminCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", engineerCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", workerCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", clientCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", otherClientCookie).expect(200)
      ]);

      const created = await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", clientCookie)
        .send({ type: "TEXT", text: "Client asking a question in the shared project chat." })
        .expect(201);

      const [adminAfter, engineerAfter, workerAfter, clientAfter, otherClientAfter] = await Promise.all([
        request(server).get("/notifications/unread-count").set("Cookie", adminCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", engineerCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", workerCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", clientCookie).expect(200),
        request(server).get("/notifications/unread-count").set("Cookie", otherClientCookie).expect(200)
      ]);

      // Admin, assigned Engineer, and assigned Worker all get notified of a Client message.
      expect(adminAfter.body.count).toBe(adminBefore.body.count + 1);
      expect(engineerAfter.body.count).toBe(engineerBefore.body.count + 1);
      expect(workerAfter.body.count).toBe(workerBefore.body.count + 1);
      // The client who sent it is never redundantly notified of their own message.
      expect(clientAfter.body.count).toBe(clientBefore.body.count);
      // An unrelated client on a different project receives nothing.
      expect(otherClientAfter.body.count).toBe(otherClientBefore.body.count);

      const adminList = await request(server).get("/notifications").set("Cookie", adminCookie).expect(200);
      const notification = adminList.body.find((item: { entityId: string }) => item.entityId === created.body.id);
      expect(notification).toBeDefined();
      expect(notification.type).toBe("CHAT_MESSAGE");
    });

    it("marks a single notification read and mark-all-read, and denies acting on another user's notification", async () => {
      const server = app.getHttpServer();

      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "Notification mark-read coverage message." })
        .expect(201);

      const adminList = await request(server).get("/notifications?status=unread").set("Cookie", adminCookie).expect(200);
      expect(adminList.body.length).toBeGreaterThan(0);
      const targetId = adminList.body[0].id;

      const marked = await request(server).patch(`/notifications/${targetId}/read`).set("Cookie", adminCookie).expect(200);
      expect(marked.body.ok).toBe(true);

      // A different user cannot mark or read someone else's notification by guessing its id.
      await request(server).patch(`/notifications/${targetId}/read`).set("Cookie", engineerCookie).expect(404);

      const beforeAll = await request(server).get("/notifications/unread-count").set("Cookie", engineerCookie).expect(200);
      const markAll = await request(server).patch("/notifications/read-all").set("Cookie", engineerCookie).expect(200);
      expect(markAll.body.unreadCount).toBe(0);
      expect(beforeAll.body.count).toBeGreaterThanOrEqual(0);

      const afterAllRead = await request(server).get("/notifications/unread-count").set("Cookie", engineerCookie).expect(200);
      expect(afterAllRead.body.count).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // CHAT READ STATE
  // ---------------------------------------------------------------------
  describe("Chat unread / read state", () => {
    it("increments unread for a recipient, resets on mark-read, and leaves another project's read state untouched", async () => {
      const server = app.getHttpServer();

      const beforeState = await request(server).get(`/projects/${projectId}/messages/read-state`).set("Cookie", adminCookie).expect(200);

      await request(server)
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "Read-state coverage message." })
        .expect(201);

      const afterState = await request(server).get(`/projects/${projectId}/messages/read-state`).set("Cookie", adminCookie).expect(200);
      expect(afterState.body.unreadCount).toBe(beforeState.body.unreadCount + 1);

      const otherProjectStateBefore = await request(server)
        .get(`/projects/${otherProjectId}/messages/read-state`)
        .set("Cookie", adminCookie)
        .expect(200);
      await request(server)
        .post(`/projects/${otherProjectId}/messages`)
        .set("Cookie", otherEngineerCookie)
        .send({ type: "TEXT", text: "Other project message that must not be affected by marking the first project read." })
        .expect(201);

      await request(server).post(`/projects/${projectId}/messages/read`).set("Cookie", adminCookie).expect(201);
      const afterMarkRead = await request(server).get(`/projects/${projectId}/messages/read-state`).set("Cookie", adminCookie).expect(200);
      expect(afterMarkRead.body.unreadCount).toBe(0);

      // Marking the first project's chat read must not touch the second project's unread state.
      const otherProjectStateAfter = await request(server)
        .get(`/projects/${otherProjectId}/messages/read-state`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(otherProjectStateAfter.body.unreadCount).toBe(otherProjectStateBefore.body.unreadCount + 1);
    });
  });

  // ---------------------------------------------------------------------
  // REALTIME AUTHORIZATION (deterministic, service-level - no live socket timing)
  // ---------------------------------------------------------------------
  describe("Realtime room-join authorization", () => {
    function fakeSocket(user: RequestUser | undefined) {
      const joined: string[] = [];
      return {
        data: { user },
        join: (room: string) => {
          joined.push(room);
          return Promise.resolve();
        },
        leave: () => Promise.resolve(),
        joined
      };
    }

    it("denies Accountant and an unrelated Client, and allows the owning Client and Admin to join the project room", async () => {
      const accountantSocket = fakeSocket({ ...clientUser, role: "ACCOUNTANT" });
      const accountantResult = await realtime.onJoinProject(accountantSocket as never, { projectId });
      expect(accountantResult).toEqual({ ok: false });
      expect(accountantSocket.joined.length).toBe(0);

      const otherClientSocket = fakeSocket(otherClientUser);
      const otherClientResult = await realtime.onJoinProject(otherClientSocket as never, { projectId });
      expect(otherClientResult).toEqual({ ok: false });
      expect(otherClientSocket.joined.length).toBe(0);

      const clientSocket = fakeSocket(clientUser);
      const clientResult = await realtime.onJoinProject(clientSocket as never, { projectId });
      expect(clientResult).toEqual({ ok: true });
      expect(clientSocket.joined).toContain(`project:${projectId}`);

      const adminSocket = fakeSocket(adminUser);
      const adminResult = await realtime.onJoinProject(adminSocket as never, { projectId });
      expect(adminResult).toEqual({ ok: true });
      expect(adminSocket.joined).toContain(`project:${projectId}`);
    });

    it("denies a join attempt with no authenticated user and no project id", async () => {
      const anonymousSocket = fakeSocket(undefined);
      const result = await realtime.onJoinProject(anonymousSocket as never, { projectId });
      expect(result).toEqual({ ok: false });

      const noProjectSocket = fakeSocket(adminUser);
      const noProjectResult = await realtime.onJoinProject(noProjectSocket as never, {});
      expect(noProjectResult).toEqual({ ok: false });
    });
  });
});
