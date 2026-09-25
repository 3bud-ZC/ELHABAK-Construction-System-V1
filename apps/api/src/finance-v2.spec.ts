import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import {
  computeLineTotalMinor,
  decimalToMinorUnits,
  formatMoneyMajor,
  minorUnitsToDecimal,
  MONEY_PATTERN,
  QUANTITY_PATTERN
} from "@elhabak/validation";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });
process.env.STORAGE_ROOT = ".codex-finv2-qa/test-storage";

describe("Finance V2 - cost control productivity surface", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let accountantCookie: string;
  let clientCookie: string;
  let projectId: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = `Test-${suffix}-Password1`;
  const testDomain = "@fv2.elhabak.local";
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
        { email: email("admin"), displayName: "FV2 Admin", role: "ADMIN", isActive: true, passwordHash },
        { email: email("accountant"), displayName: "FV2 Accountant", role: "ACCOUNTANT", isActive: true, passwordHash },
        { email: email("client"), displayName: "FV2 Client", role: "CLIENT", isActive: true, passwordHash }
      ]
    });
    const clientUser = await prisma.user.findUniqueOrThrow({ where: { email: email("client") } });
    const client = await prisma.clientProfile.create({ data: { userId: clientUser.id } });
    const project = await prisma.project.create({
      data: {
        name: "FV2 Finance Project",
        code: `FV2-${suffix}`,
        category: "CONSTRUCTION",
        clientId: client.id,
        phase: "PRELIMINARY_ESTIMATION",
        status: "ACTIVE",
        progress: 10
      }
    });
    projectId = project.id;

    [adminCookie, accountantCookie, clientCookie] = await Promise.all([
      login(email("admin")),
      login(email("accountant")),
      login(email("client"))
    ]);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.financialAttachment.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.expense.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.clientPayment.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.contractorPayment.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.bOQItem.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.costEstimateItem.deleteMany({ where: { estimate: { project: { code: { startsWith: "FV2-" } } } } });
    await prisma.costEstimate.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.projectFinancialProfile.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actor: { email: { endsWith: testDomain } } }, { project: { code: { startsWith: "FV2-" } } }] }
    });
    await prisma.projectAssignment.deleteMany({ where: { project: { code: { startsWith: "FV2-" } } } });
    await prisma.project.deleteMany({ where: { code: { startsWith: "FV2-" } } });
    await prisma.clientProfile.deleteMany({ where: { user: { email: { endsWith: testDomain } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: testDomain } } });
    await app.close();
  });

  async function login(userEmail: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error(`Missing cookie for ${userEmail}`);
    return cookie.split(";")[0];
  }

  it("money-core helpers stay exact: patterns, conversions, and BigInt line totals", () => {
    // Patterns mirror the server-side zod schemas the dialog preview must agree with.
    expect(MONEY_PATTERN.test("1250.50")).toBe(true);
    expect(MONEY_PATTERN.test("1250.505")).toBe(false);
    expect(QUANTITY_PATTERN.test("12.345")).toBe(true);
    expect(QUANTITY_PATTERN.test("12.3456")).toBe(false);
    // The exact computation the preview reproduces: qty 2.5 units @ 33.33 -> 83.33
    const qty = decimalToMinorUnits("2.5", 3);
    const rate = decimalToMinorUnits("33.33", 2);
    expect(qty).toBe(2500);
    expect(rate).toBe(3333);
    expect(computeLineTotalMinor(qty, rate)).toBe(8333); // 8332.5 -> 8333 half-up
    expect(formatMoneyMajor(computeLineTotalMinor(qty, rate))).toBe("83.33");
    // Half-down negative rounding stays symmetric.
    expect(computeLineTotalMinor(-2500, 3333)).toBe(-8333);
    expect(minorUnitsToDecimal(-8333, 2)).toBe("-83.33");
    // Mid-size magnitudes stay exact through the BigInt product: 12345.678 x 123456.78.
    expect(formatMoneyMajor(computeLineTotalMinor(12345678, 12345678))).toBe("1524157652.80");
  });

  it("exposes finance context only to Admin and Accountant", async () => {
    const server = app.getHttpServer();
    const context = await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", adminCookie).expect(200);
    expect(context.body.currency).toBe("EGP");
    expect(context.body.contractValue).toBeNull();
    await request(server)
      .patch(`/projects/${projectId}/finance/contract`)
      .set("Cookie", adminCookie)
      .send({ amount: "1000000.00", note: "FV2 contract" })
      .expect(200);
    const after = await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", accountantCookie).expect(200);
    expect(after.body.contractValue).toBe("1000000.00");
    await request(server).get(`/projects/${projectId}/finance/context`).set("Cookie", clientCookie).expect(403);
  });

  it("returns estimateTotal:null when no current estimate exists, then the real total once created", async () => {
    const server = app.getHttpServer();
    const before = await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", adminCookie).expect(200);
    expect(before.body.estimateTotal).toBeNull();
    expect(before.body.boqTotal).toBe("0.00");

    const estimate = await request(server)
      .post(`/projects/${projectId}/finance/estimates`)
      .set("Cookie", adminCookie)
      .send({ title: "FV2 Estimate v1" })
      .expect(201);
    await request(server)
      .post(`/projects/${projectId}/finance/estimates/${estimate.body.id}/items`)
      .set("Cookie", adminCookie)
      .send({ description: "Concrete works", unit: "M3", quantity: "10", unitRate: "2500.00" })
      .expect(201);
    const after = await request(server).get(`/projects/${projectId}/finance/summary`).set("Cookie", accountantCookie).expect(200);
    expect(after.body.estimateTotal).toBe("25000.00");
  });

  it("includes contract, paid, and outstanding per project in the finance portfolio", async () => {
    const server = app.getHttpServer();
    await request(server)
      .post(`/projects/${projectId}/finance/client-payments`)
      .set("Cookie", accountantCookie)
      .field("amount", "400000.50")
      .field("paymentDate", "2026-01-10")
      .field("method", "BANK_TRANSFER")
      .expect(201);
    const list = await request(server).get("/finance/projects").set("Cookie", accountantCookie).expect(200);
    const row = list.body.find((entry: { id: string }) => entry.id === projectId);
    expect(row).toBeTruthy();
    expect(row.contractValue).toBe("1000000.00");
    expect(row.clientPaymentsTotal).toBe("400000.50");
    expect(row.outstandingBalance).toBe("599999.50");
  });
});
