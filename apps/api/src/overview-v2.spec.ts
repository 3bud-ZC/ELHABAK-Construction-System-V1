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
process.env.STORAGE_ROOT = ".codex-ov2-qa/test-storage";

/**
 * Dashboard + Project Overview final pass coverage:
 * - /projects/:id/overview is role-scoped: Admin full, Engineer finance-free, Worker minimal,
 *   Client visibility-filtered, Accountant denied, unassigned/unrelated denied, anonymous 401
 * - setup derivation comes from real persisted state
 * - dashboard attention only carries actionable states (no document activity noise),
 *   real headline counts, chat noise excluded from the activity feed
 * - list endpoints no longer ship siteUpdates history
 */
describe("Dashboard + Overview V2", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let accountantCookie: string;

  let projectId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@ov2.elhabak.local";
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
        { email: email("admin"), displayName: "OV2 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "OV2 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("engineer2"), displayName: "OV2 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "OV2 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "OV2 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "OV2 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "OV2 Other Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });

    const [engineer, worker, clientUser, otherClientUser] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } }),
      prisma.user.findUniqueOrThrow({ where: { email: email("worker") } }),
      prisma.user.findUniqueOrThrow({ where: { email: email("client") } }),
      prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } })
    ]);

    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });

    // Fully configured project: engineer + worker assigned, schedule set.
    const project = await prisma.project.create({
      data: {
        name: "OV2 Main Project",
        code: `OV2-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 40,
        startDate: new Date("2026-01-01"),
        targetDate: new Date("2027-01-01"),
        assignments: { create: [{ userId: worker.id }] }
      }
    });
    projectId = project.id;

    // Setup-incomplete ACTIVE project (no engineer, no schedule) - dashboard attention fixture.
    await prisma.project.create({
      data: {
        name: "OV2 Incomplete Project",
        code: `OV2-${suffix}-B`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        phase: "SITE_INSPECTION",
        status: "ACTIVE",
        progress: 0
      }
    });

    // Overdue project: real past targetDate, still ACTIVE.
    await prisma.project.create({
      data: {
        name: "OV2 Overdue Project",
        code: `OV2-${suffix}-C`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 60,
        startDate: new Date("2024-01-01"),
        targetDate: new Date("2025-01-01")
      }
    });

    // Design states on the main project.
    await prisma.designItem.createMany({
      data: [
        { projectId, title: "OV2 Pending Design", discipline: "ARCHITECTURAL", status: "IN_REVIEW" },
        { projectId, title: "OV2 Rejected Design", discipline: "STRUCTURAL", status: "REJECTED" },
        { projectId, title: "OV2 Draft Design", discipline: "INTERIOR", status: "DRAFT" }
      ]
    });

    // Site updates: one client-visible, one internal.
    await prisma.siteUpdate.createMany({
      data: [
        { projectId, authorId: engineer.id, type: "PROGRESS", isClientVisible: true, note: "OV2 visible update" },
        { projectId, authorId: engineer.id, type: "ISSUE", isClientVisible: false, note: "OV2 internal update" }
      ]
    });

    // Documents: one shared+active, one internal, one archived-but-shared (must not count).
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: email("admin") } });
    await prisma.projectDocument.createMany({
      data: [
        { projectId, reference: `OV2-D1`, title: "OV2 Shared Doc", category: "REPORT", status: "ACTIVE", isClientVisible: true, createdById: admin.id },
        { projectId, reference: `OV2-D2`, title: "OV2 Internal Doc", category: "REPORT", status: "ACTIVE", isClientVisible: false, createdById: admin.id },
        { projectId, reference: `OV2-D3`, title: "OV2 Archived Doc", category: "REPORT", status: "ARCHIVED", isClientVisible: true, createdById: admin.id }
      ]
    });

    // Finance: configured profile + one active payment.
    await prisma.projectFinancialProfile.create({ data: { projectId, currency: "EGP", contractValueMinor: 1_000_000 } });
    await prisma.clientPayment.create({
      data: { projectId, amountMinor: 250_000, currency: "EGP", paymentDate: new Date(), method: "BANK_TRANSFER", createdById: admin.id }
    });

    [adminCookie, engineerCookie, otherEngineerCookie, workerCookie, accountantCookie, clientCookie, otherClientCookie] = await Promise.all([
      login(email("admin")),
      login(email("engineer")),
      login(email("engineer2")),
      login(email("worker")),
      login(email("accountant")),
      login(email("client")),
      login(email("other-client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.notification.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.projectChatReadState.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.projectMessage.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.clientPayment.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.projectFinancialProfile.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.projectDocument.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.designItem.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.siteUpdate.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "OV2-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "OV2-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "OV2-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-ov2-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  describe("Overview authorization matrix", () => {
    it("returns the full module set for Admin with real counts and client-safe finance trio", async () => {
      const res = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", adminCookie).expect(200);
      const body = res.body;
      expect(body.project.id).toBe(projectId);
      expect(body.project).not.toHaveProperty("siteUpdates");
      expect(body.setup).toEqual({ clientAssigned: true, engineerAssigned: true, scheduleConfigured: true, hasSiteUpdate: true });
      expect(body.site.updateCount).toBe(2);
      expect(body.design.total).toBe(3);
      expect(body.design.inReview).toBe(1);
      expect(body.design.rejected).toBe(1);
      expect(body.documents.total).toBe(2);
      expect(body.documents.clientVisible).toBe(1);
      expect(body.finance.configured).toBe(true);
      expect(body.finance.contractValue).toBe("10000.00");
      expect(body.finance.paidAmount).toBe("2500.00");
      expect(body.finance.outstandingBalance).toBe("7500.00");
      expect(body.finance).not.toHaveProperty("boqTotal");
      expect(body.finance).not.toHaveProperty("expensesTotal");
      expect(body.chat.unreadCount).toBe(0);
      expect(Array.isArray(body.recentActivity)).toBe(true);
    });

    it("gives the assigned Engineer the same module set minus finance", async () => {
      const res = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", engineerCookie).expect(200);
      expect(res.body.design.total).toBe(3);
      expect(res.body.documents.total).toBe(2);
      expect(res.body.site.updateCount).toBe(2);
      expect(res.body.finance).toBeNull();
      expect(res.body.chat.unreadCount).toBe(0);
    });

    it("gives the assigned Worker site + chat only", async () => {
      const res = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", workerCookie).expect(200);
      expect(res.body.design).toBeNull();
      expect(res.body.documents).toBeNull();
      expect(res.body.finance).toBeNull();
      expect(res.body.site.updateCount).toBe(2);
      expect(res.body.chat).toBeTruthy();
    });

    it("filters every block for the owning Client - visible site/docs only, client-safe finance, whitelisted activity", async () => {
      const res = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", clientCookie).expect(200);
      const body = res.body;
      // Internal site update is invisible to the client.
      expect(body.site.updateCount).toBe(1);
      expect(body.site.recent.every((u: { isClientVisible: boolean }) => u.isClientVisible)).toBe(true);
      // Only the shared ACTIVE document counts; internal + archived do not.
      expect(body.documents.total).toBe(1);
      expect(body.documents.clientVisible).toBeUndefined();
      // Client-safe finance trio only.
      expect(body.finance.contractValue).toBe("10000.00");
      expect(body.finance.paidAmount).toBe("2500.00");
      expect(body.finance).not.toHaveProperty("expensesTotal");
      expect(body.finance).not.toHaveProperty("boqTotal");
      // Activity feed is whitelisted to client-safe actions.
      const actions = body.recentActivity.map((e: { action: string }) => e.action);
      for (const action of actions) {
        expect([
          "project.created",
          "project.phase_changed",
          "project.progress_changed",
          "design.submitted_for_review",
          "design.client_approved",
          "design.client_rejected"
        ]).toContain(action);
      }
    });

    it("denies Accountant, unassigned Engineer, unrelated Client, and anonymous", async () => {
      await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", accountantCookie).expect(403);
      await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", otherEngineerCookie).expect(403);
      await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", otherClientCookie).expect(403);
      await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).expect(401);
    });
  });

  describe("Overview live state", () => {
    it("reflects chat unread count for a recipient and zero for the author", async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/messages`)
        .set("Cookie", engineerCookie)
        .send({ type: "TEXT", text: "OV2 unread probe" })
        .expect(201);

      const clientView = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", clientCookie).expect(200);
      expect(clientView.body.chat.unreadCount).toBeGreaterThan(0);

      const authorView = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", engineerCookie).expect(200);
      expect(authorView.body.chat.unreadCount).toBe(0);

      await request(app.getHttpServer()).post(`/projects/${projectId}/messages/read`).set("Cookie", clientCookie).send({}).expect(201);
      const reread = await request(app.getHttpServer()).get(`/projects/${projectId}/overview`).set("Cookie", clientCookie).expect(200);
      expect(reread.body.chat.unreadCount).toBe(0);
    });
  });

  describe("Admin dashboard", () => {
    it("carries real headline counts and actionable attention groups only", async () => {
      const res = await request(app.getHttpServer()).get("/admin/projects/dashboard/summary").set("Cookie", adminCookie).expect(200);
      const body = res.body;
      expect(typeof body.pendingReviewCount).toBe("number");
      expect(typeof body.overdueCount).toBe("number");
      expect(body.pendingReviewCount).toBeGreaterThanOrEqual(1);
      expect(body.overdueCount).toBeGreaterThanOrEqual(1);

      // Attention: pending + rejected designs, real overdue, setup-incomplete - no document activity.
      expect(body.attention).not.toHaveProperty("recentDocuments");
      const pendingTitles = body.attention.pendingDesigns.map((d: { title: string }) => d.title);
      const rejectedTitles = body.attention.rejectedDesigns.map((d: { title: string }) => d.title);
      expect(pendingTitles).toContain("OV2 Pending Design");
      expect(rejectedTitles).toContain("OV2 Rejected Design");

      const overdueNames = body.attention.overdueProjects.map((p: { name: string }) => p.name);
      expect(overdueNames).toContain("OV2 Overdue Project");
      expect(overdueNames).not.toContain("OV2 Main Project"); // future targetDate is not overdue

      const setupNames = body.attention.setupIncomplete.map((p: { name: string }) => p.name);
      expect(setupNames).toContain("OV2 Incomplete Project");
      const incomplete = body.attention.setupIncomplete.find((p: { name: string }) => p.name === "OV2 Incomplete Project");
      expect(incomplete.missingEngineer).toBe(true);
      expect(incomplete.missingSchedule).toBe(true);
      expect(setupNames).not.toContain("OV2 Main Project"); // fully configured stays out
    });

    it("excludes per-message chat noise from the operational activity feed", async () => {
      const res = await request(app.getHttpServer()).get("/admin/projects/dashboard/summary").set("Cookie", adminCookie).expect(200);
      const actions = res.body.recentActivity.map((e: { action: string }) => e.action);
      expect(actions).not.toContain("chat.message_sent");
      expect(actions).not.toContain("chat.voice_sent");
    });

    it("denies dashboard summary to non-admin roles", async () => {
      await request(app.getHttpServer()).get("/admin/projects/dashboard/summary").set("Cookie", engineerCookie).expect(403);
      await request(app.getHttpServer()).get("/admin/projects/dashboard/summary").set("Cookie", clientCookie).expect(403);
    });
  });

  describe("Slim project payloads", () => {
    it("omits siteUpdates history from list and detail payloads", async () => {
      const list = await request(app.getHttpServer()).get("/projects").set("Cookie", adminCookie).expect(200);
      for (const row of list.body) {
        expect(row).not.toHaveProperty("siteUpdates");
      }
      const detail = await request(app.getHttpServer()).get(`/projects/${projectId}`).set("Cookie", engineerCookie).expect(200);
      expect(detail.body).not.toHaveProperty("siteUpdates");
    });
  });
});
