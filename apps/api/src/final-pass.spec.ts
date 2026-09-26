import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".final-pass-qa/test-storage";

/**
 * Final functional pass regression: company finance control center scope/RBAC,
 * canonical aggregates, ledger filters, financial report builder, reports-center
 * section selection, client first-login credential lifecycle, and data-ops safety.
 */
describe("Final pass - finance control, reports, client lifecycle, data ops", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let accountantCookie: string;
  let engineerCookie: string;
  let workerCookie: string;
  let clientCookie: string;
  let projectA: string;
  let projectB: string;
  let projectC: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@fp.elhabak.local";
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
        { email: email("admin"), displayName: "FP Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "FP Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "FP Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "FP Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("client"), displayName: "FP Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const engineerUser = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    // A second client owns a third project so cross-tenant denial can be asserted.
    const otherClientUser = await prisma.user.create({
      data: {
        email: email("other-client"),
        displayName: "FP Other Client",
        role: "CLIENT",
        isActive: true,
        passwordHash
      }
    });
    const otherClient = await prisma.clientProfile.create({ data: { userId: otherClientUser.id } });

    const a = await prisma.project.create({
      data: {
        name: "FP Project Alpha",
        code: `FPA-${suffix}`,
        category: "CONSTRUCTION",
        clientId: client.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 40
      }
    });
    const b = await prisma.project.create({
      data: {
        name: "FP Project Beta",
        code: `FPB-${suffix}`,
        category: "CONSTRUCTION",
        clientId: client.id,
        phase: "PRELIMINARY_ESTIMATION",
        status: "ACTIVE",
        progress: 10
      }
    });
    const c = await prisma.project.create({
      data: {
        name: "FP Project Gamma",
        code: `FPC-${suffix}`,
        category: "CONSTRUCTION",
        clientId: otherClient.id,
        phase: "EXECUTION",
        status: "ACTIVE",
        progress: 5
      }
    });
    projectA = a.id;
    projectB = b.id;
    projectC = c.id;
    // Engineer report access requires an explicit assignment.
    await prisma.projectAssignment.create({ data: { projectId: projectA, userId: engineerUser.id } });

    [adminCookie, accountantCookie, engineerCookie, workerCookie, clientCookie] = await Promise.all([
      login(email("admin")),
      login(email("accountant")),
      login(email("engineer")),
      login(email("worker")),
      login(email("client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    const scope = { project: { code: { startsWith: "FP" } } };
    await prisma.expense.deleteMany({ where: scope });
    await prisma.clientPayment.deleteMany({ where: scope });
    await prisma.contractorPayment.deleteMany({ where: scope });
    await prisma.bOQItem.deleteMany({ where: scope });
    await prisma.costEstimateItem.deleteMany({ where: { estimate: { project: { code: { startsWith: "FP" } } } } });
    await prisma.costEstimate.deleteMany({ where: { project: { code: { startsWith: "FP" } } } });
    await prisma.projectFinancialProfile.deleteMany({ where: { project: { code: { startsWith: "FP" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "FP" } } }] }
    });
    await prisma.siteUpdate.deleteMany({ where: scope }).catch(() => undefined);
    await prisma.projectAssignment.deleteMany({ where: scope });
    await prisma.project.deleteMany({ where: { code: { startsWith: "FP" } } });
    // Provisioned/imported client accounts use generated @elhabak.com identifiers or
    // the test domain; both are cleaned up here.
    await prisma.clientProfile.deleteMany({
      where: { user: { email: { in: ["fp.portal.client@elhabak.com", "fp.portal.client.2@elhabak.com", "fp.portal.client.3@elhabak.com"] } } }
    });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({
      where: { email: { in: ["fp.portal.client@elhabak.com", "fp.portal.client.2@elhabak.com", "fp.portal.client.3@elhabak.com"] } }
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
  });

  async function login(userEmail: string, pwd = password): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password: pwd }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  /* ------------------------------------------------------------------ */
  /* Finance control center                                              */
  /* ------------------------------------------------------------------ */

  it("enforces the ADMIN/ACCOUNTANT finance boundary on every portfolio surface", async () => {
    const server = app.getHttpServer();
    await request(server).get("/finance/portfolio").set("Cookie", adminCookie).expect(200);
    await request(server).get("/finance/portfolio").set("Cookie", accountantCookie).expect(200);
    await request(server).get("/finance/portfolio/activity").set("Cookie", accountantCookie).expect(200);
    for (const cookie of [engineerCookie, workerCookie, clientCookie]) {
      await request(server).get("/finance/portfolio").set("Cookie", cookie).expect(403);
      await request(server).get("/finance/portfolio/activity").set("Cookie", cookie).expect(403);
      await request(server).get("/finance/report").set("Cookie", cookie).expect(403);
      await request(server).get("/finance/report/export").set("Cookie", cookie).expect(403);
      await request(server).get("/finance/report/pdf?lang=ar").set("Cookie", cookie).expect(403);
    }
    await request(server).get("/finance/portfolio").expect(401);
  });

  it("aggregates canonical persisted totals across ALL projects", async () => {
    const server = app.getHttpServer();
    await request(server)
      .patch(`/projects/${projectA}/finance/contract`)
      .set("Cookie", adminCookie)
      .send({ amount: "1000000.00" })
      .expect(200);
    await request(server)
      .patch(`/projects/${projectB}/finance/contract`)
      .set("Cookie", adminCookie)
      .send({ amount: "500000.00" })
      .expect(200);
    await request(server)
      .post(`/projects/${projectA}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "250000.00")
      .field("paymentDate", "2026-01-15")
      .field("method", "BANK_TRANSFER")
      .expect(201);
    await request(server)
      .post(`/projects/${projectB}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "100000.00")
      .field("paymentDate", "2026-03-20")
      .field("method", "CASH")
      .expect(201);
    await request(server)
      .post(`/projects/${projectA}/finance/expenses`)
      .set("Cookie", adminCookie)
      .field("amount", "75000.00")
      .field("expenseDate", "2026-02-01")
      .field("category", "MATERIAL")
      .field("description", "Concrete supply")
      .field("vendor", "FP Vendor")
      .expect(201);
    await request(server)
      .post(`/projects/${projectA}/finance/contractor-payments`)
      .set("Cookie", adminCookie)
      .field("amount", "50000.00")
      .field("paymentDate", "2026-02-05")
      .field("payee", "FP Contractor")
      .field("method", "BANK_TRANSFER")
      .expect(201);
    await request(server)
      .post(`/projects/${projectA}/finance/boq`)
      .set("Cookie", adminCookie)
      .send({ code: "A-01", section: "Structure", description: "Footings", unit: "M3", quantity: "10", unitRate: "1200.00" })
      .expect(201);

    const portfolio = await request(server).get("/finance/portfolio").set("Cookie", accountantCookie).expect(200);
    expect(portfolio.body.scope).toBe("ALL");
    const rowA = portfolio.body.projects.find((p: { id: string }) => p.id === projectA);
    const rowB = portfolio.body.projects.find((p: { id: string }) => p.id === projectB);
    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();

    // Portfolio row values equal the canonical per-project finance summary.
    const summaryA = await request(server).get(`/projects/${projectA}/finance/summary`).set("Cookie", adminCookie).expect(200);
    expect(rowA.summary.contractValue).toBe(summaryA.body.contractValue);
    expect(rowA.summary.clientPaymentsTotal).toBe(summaryA.body.clientPaymentsTotal);
    expect(rowA.summary.outstandingBalance).toBe(summaryA.body.outstandingBalance);
    expect(rowA.summary.boqTotal).toBe(summaryA.body.boqTotal);
    expect(rowA.summary.boqTotal).toBe("12000.00");
    expect(rowA.summary.committedCostTotal).toBe("125000.00");
    expect(rowA.summary.netCashPosition).toBe("125000.00");
    expect(rowA.summary.cashInTotal).toBe("250000.00");
    expect(rowA.summary.cashOutTotal).toBe("125000.00");
    expect(rowA.summary.collectionPercent).toBe(25);
    expect(rowA.summary.costVsContractPercent).toBe(12.5);

    // Combined totals = exact minor-unit sum across scope.
    expect(portfolio.body.totals.clientPaymentsTotal).toBe("350000.00");
    expect(portfolio.body.totals.contractValue).toBe("1500000.00");
  });

  it("supports ONE and SELECTED scopes plus not-found protection", async () => {
    const server = app.getHttpServer();
    const one = await request(server)
      .get(`/finance/portfolio?projectIds=${projectA}`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(one.body.scope).toBe("ONE");
    expect(one.body.projectCount).toBe(1);
    expect(one.body.totals.clientPaymentsTotal).toBe("250000.00");

    const multi = await request(server)
      .get(`/finance/portfolio?projectIds=${projectB},${projectA}`)
      .set("Cookie", accountantCookie)
      .expect(200);
    expect(multi.body.scope).toBe("SELECTED");
    expect(multi.body.projectCount).toBe(2);
    // Caller order is preserved for deterministic report output.
    expect(multi.body.projects[0].id).toBe(projectB);
    expect(multi.body.totals.clientPaymentsTotal).toBe("350000.00");

    await request(server).get("/finance/portfolio?projectIds=does-not-exist").set("Cookie", adminCookie).expect(404);
    await request(server).get("/finance/portfolio?from=2026-99-01").set("Cookie", adminCookie).expect(400);
  });

  it("applies persisted date and ledger filters server-side", async () => {
    const server = app.getHttpServer();
    // Date filter narrows the payment window to the March payment only.
    const filtered = await request(server)
      .get("/finance/portfolio?from=2026-03-01&to=2026-03-31")
      .set("Cookie", accountantCookie)
      .expect(200);
    expect(filtered.body.filters.from).toBe("2026-03-01");
    const rowA = filtered.body.projects.find((p: { id: string }) => p.id === projectA);
    const rowB = filtered.body.projects.find((p: { id: string }) => p.id === projectB);
    expect(rowA.summary.clientPaymentsTotal).toBe("0.00");
    expect(rowB.summary.clientPaymentsTotal).toBe("100000.00");

    const ledger = await request(server)
      .get("/finance/portfolio/activity?kind=EXPENSE&category=MATERIAL")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(ledger.body.rows.length).toBeGreaterThan(0);
    for (const row of ledger.body.rows) {
      expect(row.kind).toBe("EXPENSE");
      expect(row.category).toBe("MATERIAL");
    }

    const vendor = await request(server)
      .get("/finance/portfolio/activity?vendor=FP%20Vendor")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(vendor.body.rows.every((row: { party: string }) => row.party === "FP Vendor")).toBe(true);

    await request(server).get("/finance/portfolio/activity?category=BOGUS").set("Cookie", adminCookie).expect(400);
    await request(server).get("/finance/portfolio/activity?kind=BOGUS").set("Cookie", adminCookie).expect(400);

    // Voided records appear under status=VOID and are excluded from ACTIVE totals.
    const expenses = await request(server)
      .get(`/projects/${projectA}/finance/expenses`)
      .set("Cookie", adminCookie)
      .expect(200);
    const expenseId = expenses.body.find((row: { vendor: string | null }) => row.vendor === "FP Vendor").id;
    await request(server)
      .post(`/projects/${projectA}/finance/expenses/${expenseId}/void`)
      .set("Cookie", adminCookie)
      .send({ reason: "duplicate entry" })
      .expect(201);
    const voided = await request(server)
      .get("/finance/portfolio/activity?status=VOID&kind=EXPENSE")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(voided.body.rows.some((row: { id: string }) => row.id === expenseId)).toBe(true);
    const after = await request(server).get("/finance/portfolio?projectIds=" + projectA).set("Cookie", adminCookie).expect(200);
    expect(after.body.totals.expensesTotal).toBe("0.00");
    expect(after.body.totals.committedCostTotal).toBe("50000.00");
  });

  it("builds multi-project financial reports with selected sections", async () => {
    const server = app.getHttpServer();
    const report = await request(server)
      .get(`/finance/report?projectIds=${projectA},${projectB}&sections=executive,collections,activity`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(report.body.scope).toBe("SELECTED");
    expect(report.body.projectCount).toBe(2);
    expect(report.body.sections).toEqual(["executive", "collections", "activity"]);
    const entryA = report.body.projects.find((p: { project: { id: string } }) => p.project.id === projectA);
    expect(entryA.summary.clientPaymentsTotal).toBe("250000.00");
    expect(entryA.sections.collections).toBeTruthy();
    expect(entryA.sections.boq).toBeUndefined();
    expect(entryA.sections.expenses).toBeUndefined();

    const csv = await request(server)
      .get(`/finance/report/export?format=csv&dataset=summary&projectIds=${projectA}`)
      .set("Cookie", accountantCookie)
      .expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("FP Project Alpha");
    expect(csv.text).toContain("TOTAL");

    await request(server).get("/finance/report/pdf").set("Cookie", adminCookie).expect(400);
    await request(server).get("/finance/report/pdf?lang=ar").set("Cookie", clientCookie).expect(403);
  });

  /* ------------------------------------------------------------------ */
  /* Reports center                                                      */
  /* ------------------------------------------------------------------ */

  it("applies project-report section selection server-side and keeps RBAC", async () => {
    const server = app.getHttpServer();
    const full = await request(server).get(`/reports/projects/${projectA}`).set("Cookie", adminCookie).expect(200);
    expect(full.body.siteOperations).not.toBeNull();
    expect(full.body.finance).not.toBeNull();

    const sliced = await request(server)
      .get(`/reports/projects/${projectA}?sections=designs,documents`)
      .set("Cookie", adminCookie)
      .expect(200);
    expect(sliced.body.designs).not.toBeNull();
    expect(sliced.body.documents).not.toBeNull();
    expect(sliced.body.siteOperations).toBeNull();
    expect(sliced.body.finance).toBeNull();
    expect(sliced.body.communication).toBeNull();
    expect(sliced.body.activity).toBeNull();

    // Engineer report keeps the non-finance payload; finance stays null.
    const engineer = await request(server).get(`/reports/projects/${projectA}`).set("Cookie", engineerCookie).expect(200);
    expect(engineer.body.finance).toBeNull();

    // Worker is denied report access outright.
    await request(server).get(`/reports/projects/${projectA}`).set("Cookie", workerCookie).expect(403);
    await request(server).get(`/reports/projects/${projectA}/pdf?lang=ar`).set("Cookie", workerCookie).expect(403);

    // Client only sees own project, without finance; a foreign project is denied.
    const client = await request(server).get(`/reports/projects/${projectA}`).set("Cookie", clientCookie).expect(200);
    expect(client.body.finance).toBeNull();
    await request(server).get(`/reports/projects/${projectC}`).set("Cookie", clientCookie).expect(403);
  });

  /* ------------------------------------------------------------------ */
  /* Client first-login credential lifecycle                             */
  /* ------------------------------------------------------------------ */

  it("provisions client credentials and enforces first-login password change", async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post("/admin/clients")
      .set("Cookie", adminCookie)
      .send({ displayName: "FP Portal Client" })
      .expect(201);
    expect(created.body.generatedCredentials.email).toMatch(/^fp\.portal\.client(\.\d+)?@elhabak\.com$/);
    const tempPassword = created.body.generatedCredentials.temporaryPassword;
    expect(tempPassword.length).toBeGreaterThanOrEqual(10);

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { email: created.body.generatedCredentials.email }
    });
    expect(persisted.role).toBe("CLIENT");
    expect(persisted.mustChangePassword).toBe(true);
    expect(persisted.passwordHash).toBeTruthy();
    expect(persisted.passwordHash).not.toBe(tempPassword);

    // A second client with the same display name receives a distinct identifier.
    const second = await request(server)
      .post("/admin/clients")
      .set("Cookie", adminCookie)
      .send({ displayName: "FP Portal Client" })
      .expect(201);
    expect(second.body.generatedCredentials.email).not.toBe(created.body.generatedCredentials.email);

    // First login works but the session is confined to the lifecycle surface.
    const cookie = await login(created.body.generatedCredentials.email, tempPassword);
    const me = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.mustChangePassword).toBe(true);
    await request(server).get("/projects").set("Cookie", cookie).expect(403);
    await request(server).get("/finance/portfolio").set("Cookie", cookie).expect(403);
    await request(server).get("/reports/projects").set("Cookie", cookie).expect(403);

    // A second session exists to prove revocation on change.
    const otherCookie = await login(created.body.generatedCredentials.email, tempPassword);
    await request(server).get("/auth/me").set("Cookie", otherCookie).expect(200);

    const newPassword = `Client-${suffix}-NewPass9`;
    await request(server)
      .post("/auth/password/change")
      .set("Cookie", cookie)
      .send({ currentPassword: tempPassword, newPassword })
      .expect(200);

    const after = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(after.body.user.mustChangePassword).toBe(false);
    await request(server).get("/projects").set("Cookie", cookie).expect(200);

    // Other sessions were revoked by the password change.
    await request(server).get("/auth/me").set("Cookie", otherCookie).expect(401);

    // Old credential rejected; new credential accepted.
    await request(server)
      .post("/auth/login")
      .send({ email: created.body.generatedCredentials.email, password: tempPassword })
      .expect(401);
    await login(created.body.generatedCredentials.email, newPassword);
  });

  it("marks team password resets for first-login change without breaking the account", async () => {
    const server = app.getHttpServer();
    // Admin resets a team member password via the admin-users surface.
    const engineer = await prisma.user.findUniqueOrThrow({ where: { email: email("engineer") } });
    const tempPassword = `Reset-${suffix}-Temp1`;
    await request(server)
      .post(`/admin/users/${engineer.id}/reset-password`)
      .set("Cookie", adminCookie)
      .send({ temporaryPassword: tempPassword })
      .expect(200);
    const persisted = await prisma.user.findUniqueOrThrow({ where: { id: engineer.id } });
    expect(persisted.mustChangePassword).toBe(true);

    const cookie = await login(email("engineer"), tempPassword);
    await request(server).get("/projects").set("Cookie", cookie).expect(403);
    const newPassword = `Engineer-${suffix}-Pass9`;
    await request(server)
      .post("/auth/password/change")
      .set("Cookie", cookie)
      .send({ currentPassword: tempPassword, newPassword })
      .expect(200);
    await request(server).get("/projects").set("Cookie", cookie).expect(200);
    // Restore the engineer credential for the remaining suite; the original session
    // was revoked by the password change, so log in fresh.
    await prisma.user.update({
      where: { id: engineer.id },
      data: { passwordHash: await hash(password, 12), mustChangePassword: false }
    });
    engineerCookie = await login(email("engineer"));
  });

  /* ------------------------------------------------------------------ */
  /* Data operations                                                     */
  /* ------------------------------------------------------------------ */

  it("previews imports without mutation and requires explicit commit", async () => {
    const server = app.getHttpServer();
    const csv = `name,email,phone\nFP Import One,fp-import-a-${suffix}${testDomain},+201001112233\nFP Import Two,fp-import-b-${suffix}${testDomain},+201004445566`;
    const before = await prisma.user.count({ where: { email: { endsWith: testDomain } } });
    const beforeClients = await prisma.clientProfile.count();

    const preview = await request(server)
      .post("/data-ops/imports/clients/preview")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(csv, "utf8"), { filename: "clients.csv", contentType: "text/csv" })
      .expect(201);
    expect(preview.body.summary.total).toBe(2);
    expect(preview.body.summary.valid).toBe(2);
    expect(preview.body.summary.errors).toBe(0);

    // Preview alone must not persist anything.
    expect(await prisma.user.count({ where: { email: { endsWith: testDomain } } })).toBe(before);
    expect(await prisma.clientProfile.count()).toBe(beforeClients);

    const commit = await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(csv, "utf8"), { filename: "clients.csv", contentType: "text/csv" })
      .expect(201);
    expect(commit.body.created + commit.body.updated).toBeGreaterThanOrEqual(2);
    expect(commit.body.failed).toBe(0);

    // History records the job with counts and status.
    const jobs = await request(server).get("/data-ops/jobs").set("Cookie", adminCookie).expect(200);
    const job = jobs.body.find(
      (entry: { action: string; metadata: { fileName?: string } }) =>
        entry.action === "data_import.clients" && entry.metadata?.fileName === "clients.csv"
    );
    expect(job).toBeTruthy();
    expect(job.metadata.total).toBe(2);
    expect(job.metadata.failed).toBe(0);
  });

  it("rejects invalid rows and enforces import/export RBAC", async () => {
    const server = app.getHttpServer();
    const csv = `name,email\nFP Import Three,fp-import-c-${suffix}${testDomain}\n`;
    const badCsv = `name,email\n,not-an-email\n`;
    const preview = await request(server)
      .post("/data-ops/imports/clients/preview")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(badCsv, "utf8"), { filename: "bad.csv", contentType: "text/csv" })
      .expect(201);
    expect(preview.body.summary.errors).toBeGreaterThanOrEqual(1);

    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(badCsv, "utf8"), { filename: "bad.csv", contentType: "text/csv" })
      .expect(400);

    // Imports are Admin-only for clients; engineer/client denied.
    await request(server)
      .post("/data-ops/imports/clients/preview")
      .set("Cookie", engineerCookie)
      .attach("file", Buffer.from(csv, "utf8"), { filename: "clients.csv", contentType: "text/csv" })
      .expect(403);
    await request(server)
      .post("/data-ops/imports/clients/preview")
      .set("Cookie", clientCookie)
      .attach("file", Buffer.from(csv, "utf8"), { filename: "clients.csv", contentType: "text/csv" })
      .expect(403);

    // Exports are denied to client/worker and never leak credential material.
    await request(server).get("/data-ops/exports/clients?format=csv").set("Cookie", clientCookie).expect(403);
    await request(server).get("/data-ops/exports/clients?format=csv").set("Cookie", workerCookie).expect(403);
    const exportCsv = await request(server)
      .get("/data-ops/exports/clients?format=csv")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(exportCsv.text).not.toContain("passwordHash");
    expect(exportCsv.text).not.toContain("$2b$");
  });
});
