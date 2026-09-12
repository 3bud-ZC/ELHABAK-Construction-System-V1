import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PdfService } from "./modules/reports/pdf.service";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

describe("Milestone 09 Reports, PDF, and Search", () => {
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
  const domain = "@m09.elhabak.local";
  const email = (name: string) => `${name}-${suffix}${domain}`;

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    await app.init();
    prisma = app.get(PrismaService);
    vi.spyOn(app.get(PdfService), "render").mockResolvedValue(
      Buffer.from("%PDF-1.4\nM09 authorized report")
    );

    const passwordHash = await hash(password, 12);
    await prisma.user.createMany({
      data: [
        { email: email("admin"), displayName: "M09 Admin Searchable", role: "ADMIN", passwordHash },
        { email: email("engineer"), displayName: "M09 Engineer", role: "ENGINEER", passwordHash },
        {
          email: email("other-engineer"),
          displayName: "M09 Other Engineer",
          role: "ENGINEER",
          passwordHash
        },
        { email: email("worker"), displayName: "M09 Worker", role: "WORKER", passwordHash },
        {
          email: email("accountant"),
          displayName: "M09 Accountant",
          role: "ACCOUNTANT",
          passwordHash
        },
        { email: email("client"), displayName: "M09 Client", role: "CLIENT", passwordHash },
        {
          email: email("other-client"),
          displayName: "M09 Other Client",
          role: "CLIENT",
          passwordHash
        }
      ]
    });
    const [admin, engineer, otherEngineer, worker, accountant, clientUser, otherClientUser] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email: email("admin") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("other-engineer") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("worker") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("accountant") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("client") } }),
        prisma.user.findUniqueOrThrow({ where: { email: email("other-client") } })
      ]);
    const [client, otherClient] = await Promise.all([
      prisma.clientProfile.create({ data: { userId: clientUser.id } }),
      prisma.clientProfile.create({ data: { userId: otherClientUser.id } })
    ]);
    const project = await prisma.project.create({
      data: {
        name: "M09 Authorized Project",
        code: `M09-A-${suffix}`,
        category: "CONSTRUCTION",
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 48,
        clientId: client.id,
        engineerId: engineer.id,
        assignments: { create: { userId: worker.id } }
      }
    });
    const otherProject = await prisma.project.create({
      data: {
        name: "M09 Restricted Project Secret",
        code: `M09-B-${suffix}`,
        category: "DESIGN",
        clientId: otherClient.id,
        engineerId: otherEngineer.id
      }
    });
    projectId = project.id;
    otherProjectId = otherProject.id;

    await Promise.all([
      prisma.siteUpdate.create({
        data: {
          projectId,
          authorId: engineer.id,
          type: "PROGRESS",
          note: "M09 client visible update",
          isClientVisible: true
        }
      }),
      prisma.siteUpdate.create({
        data: {
          projectId,
          authorId: engineer.id,
          type: "ISSUE",
          note: "M09 internal site secret",
          isClientVisible: false
        }
      }),
      prisma.designItem.create({
        data: { projectId, title: "M09 Lobby Design", discipline: "INTERIOR", status: "IN_REVIEW" }
      }),
      prisma.projectDocument.create({
        data: {
          projectId,
          reference: `M09-SHARED-${suffix}`,
          title: "M09 Shared Report",
          category: "REPORT",
          isClientVisible: true,
          createdById: admin.id
        }
      }),
      prisma.projectDocument.create({
        data: {
          projectId,
          reference: `M09-SECRET-${suffix}`,
          title: "M09 Internal Document Secret",
          category: "CORRESPONDENCE",
          isClientVisible: false,
          createdById: admin.id
        }
      }),
      prisma.projectFinancialProfile.create({
        data: { projectId, contractValueMinor: 10000000, updatedById: accountant.id }
      }),
      prisma.clientPayment.create({
        data: {
          projectId,
          amountMinor: 2500000,
          paymentDate: new Date("2026-09-01"),
          method: "BANK_TRANSFER",
          createdById: accountant.id
        }
      }),
      prisma.expense.create({
        data: {
          projectId,
          category: "MATERIAL",
          description: "M09 Internal Expense Secret",
          amountMinor: 500000,
          expenseDate: new Date("2026-09-02"),
          createdById: accountant.id
        }
      }),
      prisma.auditLog.create({
        data: { projectId, actorId: admin.id, action: "project.progress_changed" }
      }),
      prisma.auditLog.create({
        data: { projectId, actorId: accountant.id, action: "finance.expense_recorded" }
      })
    ]);

    [
      adminCookie,
      engineerCookie,
      otherEngineerCookie,
      workerCookie,
      accountantCookie,
      clientCookie,
      otherClientCookie
    ] = await Promise.all([
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
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: domain } } } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actor: { email: { endsWith: domain } } },
          { project: { code: { startsWith: "M09-" } } }
        ]
      }
    });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M09-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: domain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: domain } } });
    await app.close();
  });

  async function login(userEmail: string) {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: userEmail, password })
      .expect(200);
    const header = response.headers["set-cookie"];
    const cookie = Array.isArray(header) ? header[0] : header;
    if (!cookie) throw new Error("Missing authentication cookie.");
    return cookie.split(";")[0];
  }

  it("enforces the report authorization matrix", async () => {
    const server = app.getHttpServer();
    await request(server).get(`/reports/projects/${projectId}`).expect(401);
    await request(server)
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", adminCookie)
      .expect(200);
    await request(server)
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", accountantCookie)
      .expect(200);
    await request(server)
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", engineerCookie)
      .expect(200);
    await request(server)
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", clientCookie)
      .expect(200);
    await request(server)
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", workerCookie)
      .expect(403);
    await request(server).get("/reports/projects").set("Cookie", workerCookie).expect(403);
  });

  it("isolates Client report data at serialization and query level", async () => {
    const response = await request(app.getHttpServer())
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(response.body.viewerRole).toBe("CLIENT");
    expect(response.body.siteOperations.updates).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain("M09 internal site secret");
    expect(response.body.documents).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain("M09 Internal Document Secret");
    expect(response.body.finance).toEqual({
      scope: "CLIENT_SAFE",
      currency: "EGP",
      contractValue: "100000.00",
      paidAmount: "25000.00",
      outstandingBalance: "75000.00"
    });
    expect(response.body.activity).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain("expense");
  });

  it("restricts Engineer reports to assigned projects and preserves BOQ-only finance scope", async () => {
    const own = await request(app.getHttpServer())
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", engineerCookie)
      .expect(200);
    expect(own.body.finance.scope).toBe("BOQ");
    expect(own.body.finance).not.toHaveProperty("expensesTotal");
    await request(app.getHttpServer())
      .get(`/reports/projects/${otherProjectId}`)
      .set("Cookie", engineerCookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", otherEngineerCookie)
      .expect(403);
  });

  it("returns finance-only Accountant reports", async () => {
    const response = await request(app.getHttpServer())
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", accountantCookie)
      .expect(200);
    expect(response.body.scope).toBe("FINANCE");
    expect(response.body.finance.scope).toBe("FULL_KPI");
    expect(response.body.siteOperations).toBeNull();
    expect(response.body.designs).toBeNull();
    expect(response.body.documents).toBeNull();
  });

  it("enforces search RBAC and excludes restricted objects", async () => {
    const server = app.getHttpServer();
    const admin = await request(server)
      .get("/search?q=M09%20Admin%20Searchable")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(admin.body.results.some((item: { type: string }) => item.type === "USER")).toBe(true);

    const clientUserSearch = await request(server)
      .get("/search?q=M09%20Admin%20Searchable")
      .set("Cookie", clientCookie)
      .expect(200);
    expect(clientUserSearch.body.results).toHaveLength(0);
    const internalDocument = await request(server)
      .get("/search?q=Internal%20Document%20Secret")
      .set("Cookie", clientCookie)
      .expect(200);
    expect(internalDocument.body.results).toHaveLength(0);
    const restrictedProject = await request(server)
      .get("/search?q=Restricted%20Project%20Secret")
      .set("Cookie", clientCookie)
      .expect(200);
    expect(restrictedProject.body.results).toHaveLength(0);
    const worker = await request(server)
      .get("/search?q=M09")
      .set("Cookie", workerCookie)
      .expect(200);
    expect(worker.body.results.every((item: { type: string }) => item.type === "PROJECT")).toBe(
      true
    );
  });

  it("blocks cross-project report and search IDOR attempts", async () => {
    await request(app.getHttpServer())
      .get(`/reports/projects/${otherProjectId}`)
      .set("Cookie", clientCookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/reports/projects/${projectId}`)
      .set("Cookie", otherClientCookie)
      .expect(403);
    const response = await request(app.getHttpServer())
      .get(`/search?q=${encodeURIComponent(`M09-B-${suffix}`)}`)
      .set("Cookie", clientCookie)
      .expect(200);
    expect(response.body.results).toHaveLength(0);
  });

  it("accepts Arabic and English PDF requests while enforcing endpoint authorization", async () => {
    const server = app.getHttpServer();
    for (const language of ["ar", "en"]) {
      const response = await request(server)
        .get(`/reports/projects/${projectId}/pdf?lang=${language}`)
        .set("Cookie", clientCookie)
        .expect(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.headers["content-disposition"]).toContain(`-${language}.pdf`);
    }
    await request(server)
      .get(`/reports/projects/${projectId}/pdf`)
      .set("Cookie", clientCookie)
      .expect(400);
    await request(server)
      .get(`/reports/projects/${projectId}/pdf?lang=fr`)
      .set("Cookie", clientCookie)
      .expect(400);
    await request(server)
      .get(`/reports/projects/${projectId}/pdf?lang=ar`)
      .set("Cookie", workerCookie)
      .expect(403);
    await request(server)
      .get(`/reports/projects/${projectId}/pdf?lang=en`)
      .set("Cookie", otherClientCookie)
      .expect(403);
  });

  it("returns truthful not-found responses for invalid report IDs", async () => {
    await request(app.getHttpServer())
      .get("/reports/projects/missing-m09-id")
      .set("Cookie", adminCookie)
      .expect(404);
    await request(app.getHttpServer())
      .get("/reports/projects/missing-m09-id/pdf?lang=en")
      .set("Cookie", adminCookie)
      .expect(404);
  });
});
