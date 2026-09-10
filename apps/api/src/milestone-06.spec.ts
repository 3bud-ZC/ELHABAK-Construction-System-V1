import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { hash } from "bcryptjs";
import { computeLineTotalMinor, decimalToMinorUnits } from "@elhabak/validation";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-m06-qa/test-storage";

describe("Milestone 06 Financial Architecture and Cost Engineering", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let accountantCookie: string;
  let engineerCookie: string;
  let otherEngineerCookie: string;
  let workerCookie: string;
  let clientCookie: string;
  let otherClientCookie: string;
  let projectId: string;
  let otherProjectId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@m06.elhabak.local";
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
        { email: email("admin"), displayName: "M06 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "M06 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("engineer"), displayName: "M06 Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("other-engineer"), displayName: "M06 Other Engineer", role: "ENGINEER", isActive: true, passwordHash },
        { email: email("worker"), displayName: "M06 Worker", role: "WORKER", isActive: true, passwordHash },
        { email: email("client"), displayName: "M06 Client", role: "CLIENT", isActive: true, passwordHash },
        { email: email("other-client"), displayName: "M06 Other Client", role: "CLIENT", isActive: true, passwordHash }
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
        name: "M06 Finance Project",
        code: `M06-${suffix}-A`,
        category: "CONSTRUCTION",
        clientId: client.id,
        engineerId: engineer.id,
        phase: "PRELIMINARY_ESTIMATION",
        status: "ACTIVE",
        progress: 15,
        assignments: { create: [{ userId: worker.id }] }
      }
    });

    const otherProject = await prisma.project.create({
      data: {
        name: "M06 Other Project",
        code: `M06-${suffix}-B`,
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

    [adminCookie, accountantCookie, engineerCookie, otherEngineerCookie, workerCookie, clientCookie, otherClientCookie] = await Promise.all([
      login(email("admin")),
      login(email("accountant")),
      login(email("engineer")),
      login(email("other-engineer")),
      login(email("worker")),
      login(email("client")),
      login(email("other-client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.financialAttachment.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.expense.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.clientPayment.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.contractorPayment.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.bOQItem.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.costEstimateItem.deleteMany({ where: { estimate: { project: { code: { startsWith: "M06-" } } } } });
    await prisma.costEstimate.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.projectFinancialProfile.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "M06-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "M06-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "M06-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
    await rm(resolve(process.cwd(), ".codex-m06-qa"), { recursive: true, force: true });
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  function fakePngBuffer(): Buffer {
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49,
      0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
  }

  it("enforces authentication and role gates on every finance endpoint", async () => {
    const server = app.getHttpServer();
    await request(server).get(`/projects/${projectId}/finance/summary`).expect(401);
    await request(server).get(`/projects/${projectId}/finance/boq`).expect(401);
    await request(server).get(`/projects/${projectId}/finance/expenses`).expect(401);
    await request(server).get(`/projects/${projectId}/finance/client-payments`).expect(401);
    await request(server).get(`/projects/${projectId}/finance/contractor-payments`).expect(401);
    await request(server).get(`/projects/${projectId}/finance/history`).expect(401);
    await request(server).patch(`/projects/${projectId}/finance/contract`).send({ amount: "100.00" }).expect(401);

    await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", workerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/boq`).set("Cookie", workerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/expenses`).set("Cookie", workerCookie).expect(403);

    // Unrelated Client and unrelated Engineer are denied on a project they have no relationship to.
    await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", otherClientCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/boq`).set("Cookie", otherEngineerCookie).expect(403);
  });

  it("grants Admin and Accountant full management access", async () => {
    const server = app.getHttpServer();
    const adminRes = await request(server)
      .patch(`/projects/${projectId}/finance/contract`)
      .set("Cookie", adminCookie)
      .send({ amount: "500000.00", note: "Initial agreed contract value" })
      .expect(200);
    expect(adminRes.body.contractValue).toBe("500000.00");

    await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", accountantCookie).expect(200);
    await request(server).get(`/projects/${projectId}/finance/boq`).set("Cookie", accountantCookie).expect(200);
    await request(server).get(`/finance/projects`).set("Cookie", accountantCookie).expect(200);
    await request(server).get(`/finance/projects`).set("Cookie", adminCookie).expect(200);
    await request(server).get(`/finance/projects`).set("Cookie", engineerCookie).expect(403);
    await request(server).get(`/finance/projects`).set("Cookie", clientCookie).expect(403);
  });

  it("denies Engineer and Client mutation of restricted financial records", async () => {
    const server = app.getHttpServer();
    await request(server)
      .post(`/projects/${projectId}/finance/boq`)
      .set("Cookie", engineerCookie)
      .send({ code: "X-1", description: "Engineer attempt", unit: "M2", quantity: "1", unitRate: "1" })
      .expect(403);

    await request(server).patch(`/projects/${projectId}/finance/contract`).set("Cookie", clientCookie).send({ amount: "1.00" }).expect(403);

    await request(server)
      .post(`/projects/${projectId}/finance/client-payments`)
      .set("Cookie", clientCookie)
      .field("amount", "1.00")
      .field("paymentDate", "2026-09-10")
      .field("method", "CASH")
      .expect(403);

    await request(server)
      .post(`/projects/${projectId}/finance/expenses`)
      .set("Cookie", engineerCookie)
      .field("category", "MATERIAL")
      .field("description", "Engineer attempt")
      .field("amount", "1.00")
      .field("expenseDate", "2026-09-10")
      .expect(403);
  });

  it("computes BOQ line totals deterministically with no floating-point drift", async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post(`/projects/${projectId}/finance/boq`)
      .set("Cookie", accountantCookie)
      .send({ code: "BOQ-T1", section: "Structure", description: "Precision test item", unit: "M2", quantity: "3.000", unitRate: "0.33" })
      .expect(201);

    // 3.000 x 0.33 = 0.99 exactly. A naive JS float multiply (3 * 0.33) also happens to
    // land on 0.99, so this case alone would not catch drift - the real proof is that the
    // stored/returned value matches the integer-minor-unit computation bit-for-bit, and the
    // second case below uses inputs where naive float math is well known to misbehave.
    expect(created.body.lineTotal).toBe("0.99");

    const quantityMilli = decimalToMinorUnits("12.505", 3);
    const unitRateMinor = decimalToMinorUnits("133.37", 2);
    const expectedTotalMinor = computeLineTotalMinor(quantityMilli, unitRateMinor);

    const precise = await request(server)
      .post(`/projects/${projectId}/finance/boq`)
      .set("Cookie", accountantCookie)
      .send({ code: "BOQ-T2", section: "Structure", description: "Odd decimal test item", unit: "M3", quantity: "12.505", unitRate: "133.37" })
      .expect(201);

    const returnedMinor = decimalToMinorUnits(precise.body.lineTotal, 2);
    expect(returnedMinor).toBe(expectedTotalMinor);

    const list = await request(server).get(`/projects/${projectId}/finance/boq`).set("Cookie", adminCookie).expect(200);
    const structureTotal = list.body.sectionTotals.find((entry: { section: string | null }) => entry.section === "Structure");
    expect(structureTotal).toBeDefined();

    // Engineer (assigned) can read but never mutate the BOQ register.
    await request(server).get(`/projects/${projectId}/finance/boq`).set("Cookie", engineerCookie).expect(200);
    await request(server).delete(`/projects/${projectId}/finance/boq/${created.body.id}`).set("Cookie", engineerCookie).expect(403);
    await request(server).delete(`/projects/${projectId}/finance/boq/${created.body.id}`).set("Cookie", accountantCookie).expect(200);
    await request(server).delete(`/projects/${projectId}/finance/boq/${precise.body.id}`).set("Cookie", accountantCookie).expect(200);
  });

  it("persists expense records, keeps them invisible to Client, and denies Client access to contractor payments", async () => {
    const server = app.getHttpServer();

    const expenseRes = await request(server)
      .post(`/projects/${projectId}/finance/expenses`)
      .set("Cookie", accountantCookie)
      .field("category", "MATERIAL")
      .field("description", "Cement delivery")
      .field("amount", "4500.00")
      .field("expenseDate", "2026-09-10")
      .field("vendor", "Test Vendor")
      .attach("attachment", fakePngBuffer(), { filename: "receipt.png", contentType: "image/png" })
      .expect(201);

    expect(expenseRes.body.amount).toBe("4500.00");
    expect(expenseRes.body.attachments.length).toBe(1);

    const list = await request(server).get(`/projects/${projectId}/finance/expenses`).set("Cookie", adminCookie).expect(200);
    expect(list.body.some((item: { id: string }) => item.id === expenseRes.body.id)).toBe(true);

    await request(server).get(`/projects/${projectId}/finance/expenses`).set("Cookie", clientCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/contractor-payments`).set("Cookie", clientCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/expenses`).set("Cookie", engineerCookie).expect(403);

    const contractorRes = await request(server)
      .post(`/projects/${projectId}/finance/contractor-payments`)
      .set("Cookie", accountantCookie)
      .field("payee", "Test Subcontractor")
      .field("amount", "2200.00")
      .field("paymentDate", "2026-09-10")
      .field("method", "CASH")
      .field("category", "SUBCONTRACTOR")
      .expect(201);

    expect(contractorRes.body.amount).toBe("2200.00");
    await request(server).get(`/projects/${projectId}/finance/contractor-payments`).set("Cookie", engineerCookie).expect(403);
  });

  it("derives client balance correctly from persisted client payments and handles overpayment without clamping", async () => {
    const server = app.getHttpServer();

    await request(server).patch(`/projects/${projectId}/finance/contract`).set("Cookie", adminCookie).send({ amount: "1000.00" }).expect(200);

    const first = await request(server)
      .post(`/projects/${projectId}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "0.10")
      .field("paymentDate", "2026-09-10")
      .field("method", "CASH")
      .field("reference", "M06-RCPT-1")
      .expect(201);
    expect(first.body.amount).toBe("0.10");

    const second = await request(server)
      .post(`/projects/${projectId}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "0.20")
      .field("paymentDate", "2026-09-10")
      .field("method", "CASH")
      .field("reference", "M06-RCPT-2")
      .attach("attachment", fakePngBuffer(), { filename: "receipt2.png", contentType: "image/png" })
      .expect(201);

    const midSummary = await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", adminCookie).expect(200);
    // 0.10 + 0.20 must equal exactly 0.30 - a naive floating-point sum famously yields 0.30000000000000004.
    expect(midSummary.body.clientPaymentsTotal).toBe("0.30");
    expect(midSummary.body.outstandingBalance).toBe("999.70");

    await request(server)
      .post(`/projects/${projectId}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "1200.00")
      .field("paymentDate", "2026-09-11")
      .field("method", "BANK_TRANSFER")
      .field("reference", "M06-RCPT-3")
      .expect(201);

    const overpaidSummary = await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", accountantCookie).expect(200);
    expect(overpaidSummary.body.clientPaymentsTotal).toBe("1200.30");
    // Overpayment must surface as a negative balance, never silently clamped to zero.
    expect(overpaidSummary.body.outstandingBalance).toBe("-200.30");

    const clientSummary = await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", clientCookie).expect(200);
    expect(clientSummary.body.paidAmount).toBe("1200.30");
    expect(clientSummary.body.outstandingBalance).toBe("-200.30");
    expect(clientSummary.body.boqTotal).toBeUndefined();
    expect(clientSummary.body.expensesTotal).toBeUndefined();

    const clientPayments = await request(server).get(`/projects/${projectId}/finance/client-payments`).set("Cookie", clientCookie).expect(200);
    expect(clientPayments.body.length).toBe(3);
    expect(clientPayments.body[0].createdBy).toBeUndefined();

    // A Client from an unrelated project cannot see this project's payments at all.
    await request(server).get(`/projects/${projectId}/finance/client-payments`).set("Cookie", otherClientCookie).expect(403);

    const attachmentId = second.body.attachments[0].id;
    await request(server)
      .get(`/projects/${projectId}/finance/client-payments/${second.body.id}/attachments/${attachmentId}/file`)
      .set("Cookie", clientCookie)
      .expect(200);
    await request(server)
      .get(`/projects/${projectId}/finance/client-payments/${second.body.id}/attachments/${attachmentId}/file`)
      .set("Cookie", otherClientCookie)
      .expect(403);
    // Cross-project IDOR: a real attachment id requested under the wrong project id is a 404, not a leak.
    await request(server)
      .get(`/projects/${otherProjectId}/finance/client-payments/${second.body.id}/attachments/${attachmentId}/file`)
      .set("Cookie", adminCookie)
      .expect(404);
  });

  it("keeps internal expense/contractor attachments inaccessible to the Client and supports void with audit history", async () => {
    const server = app.getHttpServer();

    const expenseRes = await request(server)
      .post(`/projects/${projectId}/finance/expenses`)
      .set("Cookie", accountantCookie)
      .field("category", "LABOR")
      .field("description", "Void-test expense")
      .field("amount", "300.00")
      .field("expenseDate", "2026-09-10")
      .attach("attachment", fakePngBuffer(), { filename: "internal-receipt.png", contentType: "image/png" })
      .expect(201);

    const attachmentId = expenseRes.body.attachments[0].id;

    // Client can never fetch an internal expense attachment, even with a real id.
    await request(server)
      .get(`/projects/${projectId}/finance/expenses/${expenseRes.body.id}/attachments/${attachmentId}/file`)
      .set("Cookie", clientCookie)
      .expect(403);
    await request(server)
      .get(`/projects/${projectId}/finance/expenses/${expenseRes.body.id}/attachments/${attachmentId}/file`)
      .set("Cookie", accountantCookie)
      .expect(200);

    await request(server)
      .post(`/projects/${projectId}/finance/expenses/${expenseRes.body.id}/void`)
      .set("Cookie", clientCookie)
      .send({ reason: "Client attempt" })
      .expect(403);

    const voided = await request(server)
      .post(`/projects/${projectId}/finance/expenses/${expenseRes.body.id}/void`)
      .set("Cookie", accountantCookie)
      .send({ reason: "Duplicate entry" })
      .expect(201);
    expect(voided.body.status).toBe("VOID");
    expect(voided.body.voidReason).toBe("Duplicate entry");

    await request(server)
      .post(`/projects/${projectId}/finance/expenses/${expenseRes.body.id}/void`)
      .set("Cookie", accountantCookie)
      .send({ reason: "Second void attempt" })
      .expect(409);

    const history = await request(server).get(`/projects/${projectId}/finance/history`).set("Cookie", adminCookie).expect(200);
    expect(history.body.some((event: { action: string }) => event.action === "finance.expense_voided")).toBe(true);
    expect(history.body.some((event: { action: string }) => event.action === "finance.contract_value_set")).toBe(true);

    await request(server).get(`/projects/${projectId}/finance/history`).set("Cookie", clientCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/history`).set("Cookie", engineerCookie).expect(403);
  });

  it("provides a lightweight finance project context for every authorized role and denies Worker entirely", async () => {
    const server = app.getHttpServer();

    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", adminCookie).expect(200);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", accountantCookie).expect(200);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", engineerCookie).expect(200);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", clientCookie).expect(200);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", workerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", otherEngineerCookie).expect(403);
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", otherClientCookie).expect(403);
  });

  it("supports a versioned preliminary estimate that locks previous versions read-only", async () => {
    const server = app.getHttpServer();

    const estimate = await request(server)
      .post(`/projects/${projectId}/finance/estimates`)
      .set("Cookie", accountantCookie)
      .send({ title: "Preliminary Estimate v1" })
      .expect(201);
    expect(estimate.body.version).toBe(1);
    expect(estimate.body.isCurrent).toBe(true);

    await request(server)
      .post(`/projects/${projectId}/finance/estimates`)
      .set("Cookie", accountantCookie)
      .send({ title: "Duplicate attempt" })
      .expect(409);

    const withItem = await request(server)
      .post(`/projects/${projectId}/finance/estimates/${estimate.body.id}/items`)
      .set("Cookie", accountantCookie)
      .send({ description: "Sitework allowance", unit: "M3", quantity: "10.000", unitRate: "200.00" })
      .expect(201);
    expect(withItem.body.total).toBe("2000.00");

    await request(server)
      .post(`/projects/${projectId}/finance/estimates/${estimate.body.id}/items`)
      .set("Cookie", engineerCookie)
      .send({ description: "Engineer attempt", unit: "M2", quantity: "1", unitRate: "1" })
      .expect(403);

    const versioned = await request(server)
      .post(`/projects/${projectId}/finance/estimates/${estimate.body.id}/new-version`)
      .set("Cookie", accountantCookie)
      .expect(201);
    expect(versioned.body.version).toBe(2);
    expect(versioned.body.isCurrent).toBe(true);

    await request(server)
      .post(`/projects/${projectId}/finance/estimates/${estimate.body.id}/items`)
      .set("Cookie", accountantCookie)
      .send({ description: "Should be rejected - version finalized", unit: "M2", quantity: "1", unitRate: "1" })
      .expect(409);

    const historyList = await request(server).get(`/projects/${projectId}/finance/estimates`).set("Cookie", adminCookie).expect(200);
    expect(historyList.body.find((item: { id: string; isCurrent: boolean }) => item.id === estimate.body.id)?.isCurrent).toBe(false);
  });
});
