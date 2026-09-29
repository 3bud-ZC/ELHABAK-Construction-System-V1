import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compare, hash } from "bcryptjs";
import { normalizeEgyptianMobile, passwordPolicyIssue } from "@elhabak/validation";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";
import { canonicalGeneratedTemporaryPassword, generateClientTemporaryPassword } from "./modules/auth/temporary-password";

const EIGHT_DIGITS = /^[0-9]{8}$/;

describe("client temporary password generation and phone normalization (unit)", () => {
  it("A: generates exactly 8 decimal digits with no fixed prefix", () => {
    const samples = Array.from({ length: 2000 }, () => generateClientTemporaryPassword());
    for (const password of samples) expect(password).toMatch(EIGHT_DIGITS);
    // Every position takes more than one value (no fixed prefix, no constant digit).
    for (let position = 0; position < 8; position += 1) {
      expect(new Set(samples.map((password) => password[position])).size).toBeGreaterThan(5);
    }
    // Leading zeros are kept (uniform over 00000000-99999999, left-padded).
    expect(samples.some((password) => password.startsWith("0"))).toBe(true);
  });

  it("B: consecutive passwords are not deterministic and not sequential", () => {
    const generated = Array.from({ length: 500 }, () => generateClientTemporaryPassword());
    expect(new Set(generated).size).toBeGreaterThanOrEqual(499);
    const sequential = generated.slice(1).filter((password, index) => Number(password) === Number(generated[index]) + 1);
    expect(sequential.length).toBe(0);
    for (const password of generated) {
      expect("01130666726").not.toContain(password.slice(0, 6));
    }
  });

  it("normalizes every everyday spelling of an Egyptian mobile to one canonical E.164 value", () => {
    for (const input of [
      "01130666726",
      "+201130666726",
      "201130666726",
      "00201130666726",
      "011 3066 6726",
      "+20 11 3066 6726",
      "+20 0113 066 6726",
      "(011) 3066-6726",
      "٠١١٣٠٦٦٦٧٢٦",
      "‏01130666726‎"
    ]) {
      expect(normalizeEgyptianMobile(input), input).toBe("+201130666726");
    }
  });

  it("C: rejects malformed, landline, foreign and letter-bearing numbers", () => {
    for (const input of ["", "   ", "0113066672", "011306667261", "01330666726", "0223456789", "+971501234567", "0113O666726", "0113066672a", "phone", "+20-11-abc"]) {
      expect(normalizeEgyptianMobile(input), input).toBeNull();
    }
  });

  it("folds only generated-credential input drift (separators, Arabic digits, invisible marks)", () => {
    expect(canonicalGeneratedTemporaryPassword("4827 3160")).toBe("48273160");
    expect(canonicalGeneratedTemporaryPassword("٤٨٢٧٣١٦٠")).toBe("48273160");
    expect(canonicalGeneratedTemporaryPassword("⁦4827-3160⁩")).toBe("48273160");
    expect(canonicalGeneratedTemporaryPassword("4827316")).toBeNull();
    expect(canonicalGeneratedTemporaryPassword("482731601")).toBeNull();
    // Credentials issued before the numeric policy keep their tolerance until changed.
    expect(canonicalGeneratedTemporaryPassword("eh-6726-k7p4q-9zxma")).toBe("EH-6726-K7P4Q-9ZXMA");
    expect(canonicalGeneratedTemporaryPassword(" EH 6726 K7P4Q 9ZXMA ")).toBe("EH-6726-K7P4Q-9ZXMA");
    expect(canonicalGeneratedTemporaryPassword("⁦EH–6726—K7P4Q-9ZXMA⁩\n")).toBe("EH-6726-K7P4Q-9ZXMA");
    expect(canonicalGeneratedTemporaryPassword("EHK7P4Q9ZXMA")).toBe("EH-K7P4Q-9ZXMA");
    // Anything not shaped like a generated credential keeps exact semantics.
    expect(canonicalGeneratedTemporaryPassword("MyOwn-Password-1")).toBeNull();
    expect(canonicalGeneratedTemporaryPassword("EH-6726-K7P4Q-9ZXM")).toBeNull();
    expect(canonicalGeneratedTemporaryPassword("EH-6726-K7P4Q-9ZXM0")).toBeNull();
  });

  it("I (unit): client policy is length-only (8+); staff policy is unchanged", () => {
    expect(passwordPolicyIssue("12345678", "client")).toBeNull();
    expect(passwordPolicyIssue("abcdefgh", "client")).toBeNull();
    expect(passwordPolicyIssue("1234567", "client")).toBe("too_short");
    expect(passwordPolicyIssue(" 12345678", "client")).toBe("edge_whitespace");
    expect(passwordPolicyIssue("x".repeat(129), "client")).toBe("too_long");
    expect(passwordPolicyIssue("12345678")).toBe("too_short");
  });

  it("I (unit): the staff password policy rejects weak or unreproducible passwords", () => {
    expect(passwordPolicyIssue("short1")).toBe("too_short");
    expect(passwordPolicyIssue("onlyletterspassword")).toBe("needs_letter_and_number");
    expect(passwordPolicyIssue("12345678901234")).toBe("needs_letter_and_number");
    expect(passwordPolicyIssue(" Leading-space-9")).toBe("edge_whitespace");
    expect(passwordPolicyIssue("Trailing-space-9 ")).toBe("edge_whitespace");
    expect(passwordPolicyIssue("x".repeat(129) + "1")).toBe("too_long");
    expect(passwordPolicyIssue("كلمة-سر-قوية-2026")).toBeNull();
    expect(passwordPolicyIssue("Solid-Pass-2026")).toBeNull();
  });
});

describe("client password lifecycle (API, isolated test database)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const domain = "@pw-lifecycle.test.elhabak.local";
  const email = (name: string) => `${name}-${suffix}${domain}`;
  const staffPassword = `Staff-${suffix}-Pass9`;
  const createdUserIds: string[] = [];
  const secrets: string[] = [];
  const captured: string[] = [];
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  let adminCookie = "";
  let engineerCookie = "";
  let accountantCookie = "";
  let workerCookie = "";
  let otherClientCookie = "";
  let otherClientProfileId = "";
  let otherClientUserId = "";

  let clientId = "";
  let clientUserId = "";
  let clientEmail = "";
  let temporaryPassword = "";
  let chosenPassword = "";
  let resetPassword = "";

  async function login(userEmail: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer()).post("/auth/login").send({ email: userEmail, password }).expect(200);
    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookie) throw new Error("Missing session cookie.");
    return cookie.split(";")[0] as string;
  }

  beforeAll(async () => {
    // Capture everything the API process writes so Q can prove no credential is logged.
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
      const user = await prisma.user.create({ data: { email: email(name), displayName: `PW ${name}`, role, isActive: true, passwordHash } });
      createdUserIds.push(user.id);
    }
    const other = await prisma.clientProfile.create({
      data: {
        phone: "+201009998877",
        user: { create: { email: email("other-client"), displayName: "PW Other Client", role: "CLIENT", isActive: true, passwordHash } }
      }
    });
    otherClientProfileId = other.id;
    otherClientUserId = other.userId;
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

  it("D/E/F: Admin creates a client from a phone; hash persisted, generated password logs in as CLIENT", async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post("/admin/clients")
      .set("Cookie", adminCookie)
      .send({ displayName: `PW Lifecycle ${suffix}`, phone: "+20 11 3066 6726", notes: "Lifecycle QA." })
      .expect(201);
    expect(created.headers["cache-control"]).toBe("no-store");

    clientId = created.body.id;
    clientUserId = created.body.user.id;
    createdUserIds.push(clientUserId);
    clientEmail = created.body.generatedCredentials.email;
    temporaryPassword = created.body.generatedCredentials.temporaryPassword;
    secrets.push(temporaryPassword);

    expect(created.body.phone).toBe("+201130666726");
    expect(created.body.generatedCredentials.phone).toBe("+201130666726");
    expect(temporaryPassword).toMatch(EIGHT_DIGITS);
    expect(created.body.user.mustChangePassword).toBe(true);
    expect(JSON.stringify(created.body)).not.toContain("passwordHash");

    // D: only a bcrypt hash is stored, and no column holds the plaintext.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId }, include: { clientProfile: true } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user.passwordHash).not.toContain(temporaryPassword);
    expect(await compare(temporaryPassword, user.passwordHash as string)).toBe(true);
    expect(JSON.stringify(user)).not.toContain(temporaryPassword);
    expect(user.mustChangePassword).toBe(true);

    // E/F: clean session, generated credential logs in and resolves to CLIENT.
    const cookie = await login(clientEmail, temporaryPassword);
    const me = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.role).toBe("CLIENT");
    expect(me.body.user.id).toBe(clientUserId);
    expect(me.body.user.mustChangePassword).toBe(true);

    // First-login gate is server-side: only the credential lifecycle is reachable.
    await request(server).get("/projects").set("Cookie", cookie).expect(403);
    await request(server).get("/notifications").set("Cookie", cookie).expect(403);
  });

  it("E (mobile): pasted/retyped generated credential drift is tolerated; clipboard CR/LF too", async () => {
    const arabicIndic = temporaryPassword.replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)));
    const drifted = [
      arabicIndic,
      `${temporaryPassword.slice(0, 4)} ${temporaryPassword.slice(4)}`,
      `‏${temporaryPassword}‎`,
      `${temporaryPassword}\r\n`
    ];
    for (const variant of drifted) {
      await login(`‎${clientEmail}‏`, variant);
    }
  });

  it("G: wrong and near-miss passwords are rejected", async () => {
    const server = app.getHttpServer();
    const nearMiss = temporaryPassword.slice(0, -1) + (temporaryPassword.endsWith("1") ? "2" : "1");
    for (const password of ["wrong-password", nearMiss, "01130666726", "+201130666726"]) {
      await request(server).post("/auth/login").send({ email: clientEmail, password }).expect(401);
    }
  });

  it("H/I/J: change password requires the current one, enforces policy, then revokes other sessions", async () => {
    const server = app.getHttpServer();
    const cookie = await login(clientEmail, temporaryPassword);
    const otherSession = await login(clientEmail, temporaryPassword);
    chosenPassword = `Client-${suffix}-Private9`;
    secrets.push(chosenPassword);

    // H: current password is mandatory and verified (400, the session stays valid).
    await request(server).post("/auth/password/change").set("Cookie", cookie).send({ newPassword: chosenPassword }).expect(400);
    const wrong = await request(server)
      .post("/auth/password/change")
      .set("Cookie", cookie)
      .send({ currentPassword: "not-the-password", newPassword: chosenPassword })
      .expect(400);
    expect(wrong.body.code).toBe("CURRENT_PASSWORD_INVALID");
    await request(server).get("/auth/me").set("Cookie", cookie).expect(200);

    // I: weak / unreproducible / unchanged passwords rejected server-side.
    // Clients: length-only policy - 7 characters and edge whitespace are refused.
    for (const weak of ["short1", "1234567", " Leading-space-9"]) {
      const response = await request(server)
        .post("/auth/password/change")
        .set("Cookie", cookie)
        .send({ currentPassword: temporaryPassword, newPassword: weak })
        .expect(400);
      expect(response.body.code).toBe("PASSWORD_POLICY");
    }
    const same = await request(server)
      .post("/auth/password/change")
      .set("Cookie", cookie)
      .send({ currentPassword: temporaryPassword, newPassword: temporaryPassword })
      .expect(400);
    expect(same.body.reason).toBe("same_as_current");
    // Anonymous callers cannot reach the endpoint at all.
    await request(server).post("/auth/password/change").send({ currentPassword: temporaryPassword, newPassword: chosenPassword }).expect(401);

    // J: success clears the flag, keeps this session, revokes the other one.
    const changed = await request(server)
      .post("/auth/password/change")
      .set("Cookie", cookie)
      .send({ currentPassword: temporaryPassword, newPassword: chosenPassword })
      .expect(200);
    expect(changed.body.otherSessionsRevoked).toBeGreaterThanOrEqual(1);
    const me = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.mustChangePassword).toBe(false);
    await request(server).get("/projects").set("Cookie", cookie).expect(200);
    await request(server).get("/auth/me").set("Cookie", otherSession).expect(401);

    const persisted = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    expect(persisted.mustChangePassword).toBe(false);
    expect(await compare(chosenPassword, persisted.passwordHash as string)).toBe(true);

    await request(server).post("/auth/logout").set("Cookie", cookie).send({}).expect(200);
  });

  it("K: after the change the temporary password (and its drift variants) fail; the new one works", async () => {
    const server = app.getHttpServer();
    await request(server).post("/auth/login").send({ email: clientEmail, password: temporaryPassword }).expect(401);
    await request(server).post("/auth/login").send({ email: clientEmail, password: `${temporaryPassword.slice(0, 4)} ${temporaryPassword.slice(4)}` }).expect(401);
    await login(clientEmail, chosenPassword);
  });

  it("root cause regression: the client edit form can no longer overwrite the password", async () => {
    const server = app.getHttpServer();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    await request(server)
      .patch(`/admin/clients/${clientId}`)
      .set("Cookie", adminCookie)
      .send({ phone: "01130666726", temporaryPassword: "Autofilled-Admin-Pass1" })
      .expect(400);
    const edited = await request(server)
      .patch(`/admin/clients/${clientId}`)
      .set("Cookie", adminCookie)
      .send({ notes: "Edited after credential was sent.", phone: "011 3066 6726" })
      .expect(200);
    expect(edited.body.phone).toBe("+201130666726");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    expect(after.passwordHash).toBe(before.passwordHash);
    await login(clientEmail, chosenPassword);
  });

  it("L/M/N/O: Admin reset generates a new credential, revokes sessions, old ones fail", async () => {
    const server = app.getHttpServer();
    const liveSession = await login(clientEmail, chosenPassword);
    await request(server).get("/auth/me").set("Cookie", liveSession).expect(200);

    const reset = await request(server)
      .post(`/admin/clients/${clientId}/reset-password`)
      .set("Cookie", adminCookie)
      .send({})
      .expect(200);
    expect(reset.headers["cache-control"]).toBe("no-store");
    resetPassword = reset.body.temporaryPassword;
    secrets.push(resetPassword);
    expect(resetPassword).toMatch(EIGHT_DIGITS);
    expect(resetPassword).not.toBe(temporaryPassword);
    expect(reset.body.email).toBe(clientEmail);
    expect(reset.body.sessionsRevoked).toBeGreaterThanOrEqual(1);
    expect(Object.keys(reset.body).sort()).toEqual(
      ["clientId", "displayName", "email", "isActive", "phone", "sessionsRevoked", "temporaryPassword"].sort()
    );

    // O: pre-existing session revoked.
    await request(server).get("/auth/me").set("Cookie", liveSession).expect(401);
    // M: previous credentials fail.
    await request(server).post("/auth/login").send({ email: clientEmail, password: chosenPassword }).expect(401);
    await request(server).post("/auth/login").send({ email: clientEmail, password: temporaryPassword }).expect(401);
    // N: new temporary credential works and re-arms the first-login gate.
    const cookie = await login(clientEmail, resetPassword);
    const me = await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.mustChangePassword).toBe(true);
    const persisted = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    expect(persisted.mustChangePassword).toBe(true);

    // A second reset invalidates the first reset's credential as well.
    const second = await request(server).post(`/admin/clients/${clientId}/reset-password`).set("Cookie", adminCookie).send({}).expect(200);
    secrets.push(second.body.temporaryPassword);
    expect(second.body.temporaryPassword).not.toBe(resetPassword);
    await request(server).post("/auth/login").send({ email: clientEmail, password: resetPassword }).expect(401);
    resetPassword = second.body.temporaryPassword;
    await login(clientEmail, resetPassword);
  });

  it("impersonation: Admin can view a pending client but cannot change its password", async () => {
    const server = app.getHttpServer();
    const adminSession = await login(email("admin"), staffPassword);
    await request(server).post(`/admin/users/${clientUserId}/impersonate`).set("Cookie", adminSession).send({}).expect(200);
    await request(server).get("/projects").set("Cookie", adminSession).expect(200);
    const blocked = await request(server)
      .post("/auth/password/change")
      .set("Cookie", adminSession)
      .send({ currentPassword: resetPassword, newPassword: `Hijack-${suffix}-Pass9` })
      .expect(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_IMPERSONATION");
    await request(server).post("/auth/impersonation/exit").set("Cookie", adminSession).send({}).expect(200);
    await login(clientEmail, resetPassword);
  });

  it("R/S: only Admin resets; clients cannot touch another user's password", async () => {
    const server = app.getHttpServer();
    for (const cookie of [engineerCookie, accountantCookie, workerCookie, otherClientCookie]) {
      await request(server).post(`/admin/clients/${clientId}/reset-password`).set("Cookie", cookie).send({}).expect(403);
      await request(server).post(`/admin/users/${clientUserId}/reset-password`).set("Cookie", cookie).send({ temporaryPassword: "Hijacked-Pass-2026" }).expect(403);
      await request(server).patch(`/admin/clients/${clientId}`).set("Cookie", cookie).send({ notes: "x" }).expect(403);
    }
    await request(server).post(`/admin/clients/${clientId}/reset-password`).send({}).expect(401);
    await request(server).post(`/admin/clients/does-not-exist/reset-password`).set("Cookie", adminCookie).send({}).expect(404);

    // A client's own change affects only their own account.
    const otherBefore = await prisma.user.findUniqueOrThrow({ where: { id: otherClientUserId } });
    const target = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    await request(server)
      .post("/auth/password/change")
      .set("Cookie", otherClientCookie)
      .send({ currentPassword: resetPassword, newPassword: `Other-${suffix}-Pass9` })
      .expect(400);
    const otherAfter = await prisma.user.findUniqueOrThrow({ where: { id: otherClientUserId } });
    const targetAfter = await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } });
    expect(otherAfter.passwordHash).toBe(otherBefore.passwordHash);
    expect(targetAfter.passwordHash).toBe(target.passwordHash);
  });

  it("T: suspended and archived client accounts stay denied, even with a valid credential", async () => {
    const server = app.getHttpServer();
    await request(server).patch(`/admin/clients/${clientId}`).set("Cookie", adminCookie).send({ isActive: false }).expect(200);
    await request(server).post("/auth/login").send({ email: clientEmail, password: resetPassword }).expect(401);
    await request(server).post("/auth/login").send({ email: clientEmail, password: `${resetPassword.slice(0, 4)} ${resetPassword.slice(4)}` }).expect(401);
    // A reset while suspended is allowed but does not reopen login.
    const whileSuspended = await request(server).post(`/admin/clients/${clientId}/reset-password`).set("Cookie", adminCookie).send({}).expect(200);
    secrets.push(whileSuspended.body.temporaryPassword);
    await request(server).post("/auth/login").send({ email: clientEmail, password: whileSuspended.body.temporaryPassword }).expect(401);

    await request(server).post(`/admin/users/${clientUserId}/archive`).set("Cookie", adminCookie).send({}).expect(200);
    await request(server).post("/auth/login").send({ email: clientEmail, password: whileSuspended.body.temporaryPassword }).expect(401);
    await request(server).post(`/admin/clients/${clientId}/reset-password`).set("Cookie", adminCookie).send({}).expect(409);
  });

  it("C (API): malformed or missing phones are rejected at client creation", async () => {
    const server = app.getHttpServer();
    const before = await prisma.clientProfile.count();
    for (const phone of [undefined, "", "12345", "0223456789", "+971501234567", "0113O666726"]) {
      await request(server)
        .post("/admin/clients")
        .set("Cookie", adminCookie)
        .send({ displayName: `PW Invalid ${suffix}`, ...(phone === undefined ? {} : { phone }) })
        .expect(400);
    }
    // An Admin-chosen client password is no longer accepted.
    await request(server)
      .post("/admin/clients")
      .set("Cookie", adminCookie)
      .send({ displayName: `PW Invalid ${suffix}`, phone: "01130666726", temporaryPassword: "Admin-Typed-Pass1" })
      .expect(400);
    expect(await prisma.clientProfile.count()).toBe(before);
  });

  it("P/Q: no credential or hash in audit metadata, read APIs, or process logs", async () => {
    const server = app.getHttpServer();
    const hashes = (await prisma.user.findUniqueOrThrow({ where: { id: clientUserId } })).passwordHash as string;
    const audit = await prisma.auditLog.findMany({
      where: {
        OR: [
          { metadata: { path: ["targetUserId"], equals: clientUserId } },
          { metadata: { path: ["userId"], equals: clientUserId } }
        ]
      }
    });
    const actions = audit.map((entry) => entry.action);
    expect(actions).toContain("client.created");
    expect(actions).toContain("user.password_changed");
    expect(actions.filter((action) => action === "user.password_reset").length).toBeGreaterThanOrEqual(3);
    expect(audit.some((entry) => entry.action === "user.password_reset" && (entry.metadata as Record<string, unknown>).method === "generated")).toBe(true);
    const auditText = JSON.stringify(audit);
    for (const secret of [...secrets, hashes]) expect(auditText).not.toContain(secret);
    expect(auditText.toLowerCase()).not.toMatch(/"(temporary)?password(hash)?"/);

    const detail = await request(server).get(`/admin/clients/${clientId}`).set("Cookie", adminCookie).expect(200);
    const list = await request(server).get("/admin/clients").set("Cookie", adminCookie).expect(200);
    const users = await request(server).get(`/admin/users/${clientUserId}`).set("Cookie", adminCookie).expect(200);
    for (const body of [detail.body, list.body, users.body]) {
      const text = JSON.stringify(body);
      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("temporaryPassword");
      for (const secret of [...secrets, hashes]) expect(text).not.toContain(secret);
    }

    const logText = captured.join("");
    for (const secret of [...secrets, hashes]) expect(logText).not.toContain(secret);
  });

  it("the password endpoints for the other role accounts remain intact", async () => {
    // Guard against collateral damage: the staff accounts used above still sign in.
    await login(email("engineer"), staffPassword);
    await login(email("other-client"), staffPassword);
    expect(otherClientProfileId).toBeTruthy();
  });
});
