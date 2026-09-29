import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import ExcelJS from "exceljs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";


describe("data-ops: client import password lifecycle & credentials (isolated test DB)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const domain = "@dataops-pw.test.elhabak.local";
  const email = (name: string) => `${name}-${suffix}${domain}`;
  const staffPassword = `Staff-${suffix}-Pass9`;
  const createdUserIds: string[] = [];
  const captured: string[] = [];
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  let adminCookie = "";
  let engineerCookie = "";
  let accountantCookie = "";
  let workerCookie = "";
  let otherClientCookie = "";

  let csvClientEmail = "";
  const csvClientPhone = "01130666726";
  let csvTemporaryPassword = "";
  const csvChosenPassword = `New-Chosen-${suffix}-Pass1`;

  let xlsxClientEmail = "";
  let xlsxTemporaryPassword = "";

  async function login(userEmail: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error("Missing session cookie.");
    return cookie.split(";")[0] as string;
  }

  async function makeXlsxBuffer(
    headers: string[],
    rows: Array<Record<string, string | number | boolean | null>>
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Clients");
    sheet.columns = headers.map((h) => ({ header: h, key: h }));
    for (const r of rows) {
      sheet.addRow(r);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  beforeAll(async () => {
    process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (originalStdout as (...args: unknown[]) => boolean)(chunk, ...rest);
    });
    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
      captured.push(String(chunk));
      return (originalStderr as (...args: unknown[]) => boolean)(chunk, ...rest);
    });

    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await hash(staffPassword, 12);
    for (const [name, role] of [
      ["admin", "ADMIN"],
      ["engineer", "ENGINEER"],
      ["accountant", "ACCOUNTANT"],
      ["worker", "WORKER"]
    ] as const) {
      const user = await prisma.user.create({
        data: { email: email(name), displayName: `DO ${name}`, role, isActive: true, passwordHash }
      });
      createdUserIds.push(user.id);
    }

    const other = await prisma.clientProfile.create({
      data: {
        phone: "+201009998877",
        user: { create: { email: email("other-client"), displayName: "DO Other Client", role: "CLIENT", isActive: true, passwordHash } }
      }
    });
    createdUserIds.push(other.userId);

    adminCookie = await login(email("admin"), staffPassword);
    engineerCookie = await login(email("engineer"), staffPassword);
    accountantCookie = await login(email("accountant"), staffPassword);
    workerCookie = await login(email("worker"), staffPassword);
    otherClientCookie = await login(email("other-client"), staffPassword);
  });

  afterAll(async () => {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    if (!prisma) return;
    try {
      const ids = [...new Set(createdUserIds)];
      await prisma.authSession.deleteMany({ where: { OR: [{ userId: { in: ids } }, { impersonatedUserId: { in: ids } }] } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.clientProfile.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await app.close();
    }
  });

  it("1, 3, 4, 7, 14: valid CSV client import creates CLIENT with canonical password and phone", async () => {
    const server = app.getHttpServer();
    csvClientEmail = email("csv-client");
    const csvContent = `name,email,phone\nCSV Client One,${csvClientEmail},${csvClientPhone}\n`;

    const res = await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.created).toBe(1);
    expect(res.body.createdClients).toHaveLength(1);

    const created = res.body.createdClients[0];
    expect(created.name).toBe("CSV Client One");
    expect(created.email).toBe(csvClientEmail);
    expect(created.phone).toBe("+201130666726"); // Normalized to E.164
    expect(created.temporaryPassword).toMatch(/^[0-9]{8}$/);

    csvTemporaryPassword = created.temporaryPassword;

    // DB verification: user exists, role CLIENT, mustChangePassword=true, only bcrypt hash persisted
    const dbUser = await prisma.user.findUnique({
      where: { email: csvClientEmail },
      include: { clientProfile: true }
    });
    expect(dbUser).not.toBeNull();
    createdUserIds.push(dbUser!.id);

    expect(dbUser!.role).toBe("CLIENT");
    expect(dbUser!.mustChangePassword).toBe(true);
    expect(dbUser!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(dbUser!.passwordHash).not.toBe(csvTemporaryPassword);
    expect(dbUser!.passwordHash).not.toContain(csvTemporaryPassword);
    expect(dbUser!.clientProfile?.phone).toBe("+201130666726");
  });

  it("2, 3: valid Excel-equivalent parsed input creates CLIENT with normalized phone", async () => {
    const server = app.getHttpServer();
    xlsxClientEmail = email("xlsx-client");
    const xlsxBuffer = await makeXlsxBuffer(["name", "email", "phone", "active"], [
      { name: "Excel Client One", email: xlsxClientEmail, phone: "+20 100 555 1234", active: "yes" }
    ]);

    const res = await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .attach("file", xlsxBuffer, "clients.xlsx")
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.created).toBe(1);
    expect(res.body.createdClients).toHaveLength(1);

    const created = res.body.createdClients[0];
    expect(created.email).toBe(xlsxClientEmail);
    expect(created.phone).toBe("+201005551234");
    expect(created.temporaryPassword).toMatch(/^[0-9]{8}$/);

    xlsxTemporaryPassword = created.temporaryPassword;

    const dbUser = await prisma.user.findUnique({
      where: { email: xlsxClientEmail },
      include: { clientProfile: true }
    });
    expect(dbUser).not.toBeNull();
    createdUserIds.push(dbUser!.id);
    expect(dbUser!.role).toBe("CLIENT");
    expect(dbUser!.mustChangePassword).toBe(true);
    expect(dbUser!.clientProfile?.phone).toBe("+201005551234");
  });

  it("5, 6: generated credential successfully logs in with mustChangePassword=true", async () => {
    const server = app.getHttpServer();

    // Login with temporary password
    const loginRes = await request(server)
      .post("/auth/login")
      .send({ email: csvClientEmail, password: csvTemporaryPassword })
      .expect(200);

    const setCookie = loginRes.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];
    expect(cookie).toBeTruthy();

    // /auth/me returns mustChangePassword: true
    const meRes = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(meRes.body.user.mustChangePassword).toBe(true);
    expect(meRes.body.user.role).toBe("CLIENT");
  });

  it("8, 9: invalid phone row is rejected and creates no orphan user/profile", async () => {
    const server = app.getHttpServer();
    const badEmailMissing = email("bad-phone-missing");
    const badEmailInvalid = email("bad-phone-invalid");
    const badEmailForeign = email("bad-phone-foreign");

    const badCsv = `name,email,phone\nMissing Phone,${badEmailMissing},\nBad Phone,${badEmailInvalid},12345\nForeign Phone,${badEmailForeign},+15551234567\n`;

    // Preview reports all three rows as errors
    const previewRes = await request(server)
      .post("/data-ops/imports/clients/preview")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(badCsv, "utf8"), "bad.csv")
      .expect(201);

    expect(previewRes.body.summary.errors).toBe(3);
    expect(previewRes.body.rows.every((r: { status: string }) => r.status === "error")).toBe(true);

    // Commit is rejected with 400 Bad Request
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .attach("file", Buffer.from(badCsv, "utf8"), "bad.csv")
      .expect(400);

    // Verify no orphan records created in database
    const users = await prisma.user.findMany({
      where: { email: { in: [badEmailMissing, badEmailInvalid, badEmailForeign] } }
    });
    expect(users).toHaveLength(0);

    const profiles = await prisma.clientProfile.findMany({
      where: { phone: { in: ["", "12345", "+15551234567"] } }
    });
    expect(profiles).toHaveLength(0);
  });

  it("10: duplicate/existing Client does not rotate password", async () => {
    const server = app.getHttpServer();

    // Get current password hash of the CSV client before duplicate import
    const beforeUser = await prisma.user.findUnique({ where: { email: csvClientEmail } });
    const originalHash = beforeUser!.passwordHash;

    // Import a CSV containing the existing client email with strategy=update
    const dupCsv = `name,email,phone,notes\nCSV Client Updated,${csvClientEmail},01130666726,Updated notes\n`;

    const dupRes = await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", adminCookie)
      .field("strategy", "update")
      .attach("file", Buffer.from(dupCsv, "utf8"), "dup.csv")
      .expect(201);

    expect(dupRes.body.updated).toBe(1);
    expect(dupRes.body.created).toBe(0);
    // createdClients should be empty because no new account was created
    expect(dupRes.body.createdClients).toHaveLength(0);

    // Verify database passwordHash was NOT modified
    const afterUser = await prisma.user.findUnique({
      where: { email: csvClientEmail },
      include: { clientProfile: true }
    });
    expect(afterUser!.passwordHash).toBe(originalHash);
    expect(afterUser!.displayName).toBe("CSV Client Updated");
    expect(afterUser!.clientProfile?.notes).toBe("Updated notes");

    // Existing temporary password still works!
    await request(server)
      .post("/auth/login")
      .send({ email: csvClientEmail, password: csvTemporaryPassword })
      .expect(200);
  });

  it("11, 12: imported client changes password, old temporary password fails, new one works", async () => {
    const server = app.getHttpServer();

    // Login with temporary password
    const clientCookie = await login(csvClientEmail, csvTemporaryPassword);

    // Change password
    await request(server)
      .post("/auth/password/change")
      .set("Cookie", clientCookie)
      .send({ currentPassword: csvTemporaryPassword, newPassword: csvChosenPassword })
      .expect(200);

    // Old temporary password now FAILS
    await request(server)
      .post("/auth/login")
      .send({ email: csvClientEmail, password: csvTemporaryPassword })
      .expect(401);

    // New chosen password SUCCEEDS
    const newSessionRes = await request(server)
      .post("/auth/login")
      .send({ email: csvClientEmail, password: csvChosenPassword })
      .expect(200);

    const setCookie = newSessionRes.headers["set-cookie"];
    const newCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];

    const meRes = await request(server).get("/auth/me").set("Cookie", newCookie).expect(200);
    expect(meRes.body.user.mustChangePassword).toBe(false);
  });

  it("13: plaintext password is completely absent from audit logs, process logs, and client read APIs", async () => {
    const server = app.getHttpServer();

    // Read client via Admin client API
    const clientsList = await request(server).get("/admin/clients").set("Cookie", adminCookie).expect(200);
    const target = clientsList.body.find(
      (c: { id: string; user?: { email: string }; email?: string }) =>
        c.user?.email === csvClientEmail || c.email === csvClientEmail
    );
    expect(target).toBeTruthy();
    expect(target.password).toBeUndefined();
    expect(target.passwordHash).toBeUndefined();
    expect(target.temporaryPassword).toBeUndefined();

    // Read client by ID
    const single = await request(server).get(`/admin/clients/${target.id}`).set("Cookie", adminCookie).expect(200);
    expect(single.body.password).toBeUndefined();
    expect(single.body.passwordHash).toBeUndefined();
    expect(single.body.temporaryPassword).toBeUndefined();

    // Plaintext temporary password and chosen password must NEVER appear in read bodies
    for (const body of [clientsList.body, single.body]) {
      const text = JSON.stringify(body);
      expect(text).not.toContain(csvTemporaryPassword);
      expect(text).not.toContain(csvChosenPassword);
      expect(text).not.toContain("passwordHash");
    }

    // Check AuditLog table for imported client events
    const auditEntries = await prisma.auditLog.findMany({
      where: {
        action: { in: ["data_import.clients", "user.password_changed"] }
      }
    });
    for (const entry of auditEntries) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(csvTemporaryPassword);
      expect(serialized).not.toContain(xlsxTemporaryPassword);
    }

    // Check captured process stdout/stderr
    const allLogs = captured.join("");
    expect(allLogs).not.toContain(csvTemporaryPassword);
    expect(allLogs).not.toContain(xlsxTemporaryPassword);
  });

  it("15: unauthorized roles cannot execute client import or receive credential results", async () => {
    const server = app.getHttpServer();
    const csvContent = `name,email,phone\nUnauthorized Client,unauth@test.elhabak.local,01130666726\n`;

    // Engineer: 403 Forbidden
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", engineerCookie)
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(403);

    // Accountant: 403 Forbidden
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", accountantCookie)
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(403);

    // Worker: 403 Forbidden
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", workerCookie)
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(403);

    // Client: 403 Forbidden
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .set("Cookie", otherClientCookie)
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(403);

    // Anonymous: 401 Unauthorized
    await request(server)
      .post("/data-ops/imports/clients/commit")
      .attach("file", Buffer.from(csvContent, "utf8"), "clients.csv")
      .expect(401);
  });
});
