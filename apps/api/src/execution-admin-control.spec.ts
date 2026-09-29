import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";
import { executionProgress } from "./modules/projects/execution.service";

process.env.STORAGE_ROOT = ".codex-exec-qa/test-storage";

/**
 * Execution work packages, multi-engineer project teams, permanent Project/Client deletion
 * and the simplified client password policy - against the isolated elhabak_test database.
 */
describe("execution control, permanent deletion and client password policy", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const storageRoot = resolve(process.cwd(), ".codex-exec-qa/test-storage");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const domain = "@exec.test.elhabak.local";
  const password = `Exec-${suffix}-Pass9`;
  type IdKey = "admin" | "lead" | "electrical" | "outsider" | "worker1" | "worker2" | "accountant" | "client" | "otherClient" | "doomedClient" | "clientProfile" | "otherClientProfile" | "doomedClientProfile" | "project" | "otherProject" | "stageElectrical" | "stagePlumbing" | "stageFacade" | "foreignStage" | "doomed" | "doomedFiles" | "doomedClientFiles" | "doomedClientProjects";
  const ids = {} as Record<IdKey, string>;
  const cookies: Record<string, string> = {};
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const clientProfileIds: string[] = [];

  const server = () => app.getHttpServer();

  async function login(email: string, secret = password): Promise<string> {
    const response = await request(server()).post("/auth/login").send({ email, password: secret }).expect(200);
    const setCookie = response.headers["set-cookie"];
    return String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0] as string;
  }

  async function createUser(key: string, role: "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER" | "CLIENT", specialty?: string) {
    const user = await prisma.user.create({
      data: {
        email: `${key}-${suffix}${domain}`.toLowerCase(),
        displayName: `${key} ${suffix}`,
        role,
        specialty: specialty ?? null,
        passwordHash: await hash(password, 10)
      }
    });
    ids[key as IdKey] = user.id;
    userIds.push(user.id);
    if (role === "CLIENT") {
      const profile = await prisma.clientProfile.create({ data: { userId: user.id, phone: "+201130666726" } });
      ids[`${key}Profile` as IdKey] = profile.id;
      clientProfileIds.push(profile.id);
    }
    cookies[key] = await login(user.email);
    return user;
  }

  async function writeStored(relative: string, content = "fixture") {
    const absolute = join(storageRoot, relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    return relative;
  }

  /** Fills one project with a row in every project-owned table, plus real files on disk. */
  async function seedProjectGraph(projectId: string, actorId: string, clientUserId: string) {
    const files: string[] = [];
    const stage = await prisma.executionStage.create({ data: { projectId, name: "Electrical Works", createdById: actorId } });
    await prisma.executionStageAssignment.create({ data: { stageId: stage.id, userId: ids.worker1 } });
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: ids.worker1 } },
      update: {},
      create: { projectId, userId: ids.worker1 }
    });
    const update = await prisma.siteUpdate.create({ data: { projectId, authorId: actorId, note: "graph", executionStageId: stage.id } });
    files.push(await writeStored(`projects/${projectId}/site-updates/a-${suffix}.jpg`));
    await prisma.siteMedia.create({
      data: { siteUpdateId: update.id, projectId, uploaderId: actorId, mediaType: "IMAGE", storagePath: files.at(-1) as string, storedFilename: "a.jpg", originalFilename: "a.jpg", mimeType: "image/jpeg", fileSize: 7 }
    });
    const design = await prisma.designItem.create({ data: { projectId, title: "Plan", discipline: "ARCHITECTURAL" } });
    files.push(await writeStored(`projects/${projectId}/designs/d-${suffix}.pdf`));
    const revision = await prisma.designRevision.create({
      data: { designId: design.id, projectId, revisionNumber: 1, storagePath: files.at(-1) as string, storedFilename: "d.pdf", originalFilename: "d.pdf", mimeType: "application/pdf", fileSize: 7, uploaderId: actorId }
    });
    await prisma.designEvent.create({ data: { designId: design.id, revisionId: revision.id, actorId: clientUserId, action: "COMMENT_ADDED", comment: "ok" } });
    const document = await prisma.projectDocument.create({ data: { projectId, reference: `DOC-${suffix}`, title: "Contract", category: "CONTRACT", createdById: actorId } });
    files.push(await writeStored(`projects/${projectId}/documents/${document.id}/v1/c-${suffix}.pdf`));
    await prisma.projectDocumentVersion.create({
      data: { documentId: document.id, projectId, versionNumber: 1, storagePath: files.at(-1) as string, storedFilename: "c.pdf", originalFilename: "c.pdf", mimeType: "application/pdf", extension: ".pdf", fileSize: 7, checksumSha256: "x", uploadedById: actorId }
    });
    await prisma.projectFinancialProfile.create({ data: { projectId, contractValueMinor: 100_000 } });
    const estimate = await prisma.costEstimate.create({ data: { projectId, title: "Estimate", createdById: actorId } });
    await prisma.costEstimateItem.create({ data: { estimateId: estimate.id, description: "Item", unit: "M2", quantityMilli: 1000, unitRateMinor: 100, lineTotalMinor: 100 } });
    await prisma.bOQItem.create({ data: { projectId, code: "B1", description: "Boq", unit: "M", quantityMilli: 1000, unitRateMinor: 100, lineTotalMinor: 100, createdById: actorId } });
    const expense = await prisma.expense.create({ data: { projectId, category: "MATERIAL", description: "Cement", amountMinor: 500, expenseDate: new Date(), createdById: actorId } });
    files.push(await writeStored(`projects/${projectId}/finance/r-${suffix}.pdf`));
    await prisma.financialAttachment.create({
      data: { projectId, kind: "EXPENSE", expenseId: expense.id, storagePath: files.at(-1) as string, storedFilename: "r.pdf", originalFilename: "r.pdf", mimeType: "application/pdf", fileSize: 7, uploadedById: actorId }
    });
    await prisma.clientPayment.create({ data: { projectId, amountMinor: 1000, paymentDate: new Date(), method: "CASH", createdById: actorId } });
    await prisma.contractorPayment.create({ data: { projectId, payee: "Sub", amountMinor: 200, paymentDate: new Date(), method: "CASH", createdById: actorId } });
    await prisma.projectMessage.create({ data: { projectId, authorId: clientUserId, type: "TEXT", text: "hello" } });
    const voice = await prisma.projectMessage.create({ data: { projectId, authorId: actorId, type: "VOICE" } });
    files.push(await writeStored(`projects/${projectId}/chat/voice/${voice.id}/v-${suffix}.webm`));
    await prisma.projectMessage.update({
      where: { id: voice.id },
      data: { storagePath: files.at(-1) as string, storedFilename: "v.webm", originalFilename: "v.webm", mimeType: "audio/webm", fileSize: 7, durationSeconds: 1 }
    });
    await prisma.projectChatReadState.create({ data: { projectId, userId: clientUserId } });
    await prisma.notification.create({ data: { projectId, userId: clientUserId, type: "SITE_UPDATE", title: "n" } });
    await prisma.auditLog.create({ data: { projectId, actorId, action: "project.edited" } });
    return { files, stageId: stage.id };
  }

  async function projectRowCounts(projectId: string) {
    const where = { projectId };
    const counts = await Promise.all([
      prisma.project.count({ where: { id: projectId } }),
      prisma.executionStage.count({ where }),
      prisma.executionStageAssignment.count({ where: { stage: where } }),
      prisma.projectAssignment.count({ where }),
      prisma.siteUpdate.count({ where }),
      prisma.siteMedia.count({ where }),
      prisma.designItem.count({ where }),
      prisma.designRevision.count({ where }),
      prisma.projectDocument.count({ where }),
      prisma.projectDocumentVersion.count({ where }),
      prisma.projectFinancialProfile.count({ where }),
      prisma.costEstimate.count({ where }),
      prisma.bOQItem.count({ where }),
      prisma.expense.count({ where }),
      prisma.clientPayment.count({ where }),
      prisma.contractorPayment.count({ where }),
      prisma.financialAttachment.count({ where }),
      prisma.projectMessage.count({ where }),
      prisma.projectChatReadState.count({ where }),
      prisma.notification.count({ where }),
      prisma.auditLog.count({ where })
    ]);
    return counts.reduce((sum, value) => sum + value, 0);
  }

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await createUser("admin", "ADMIN");
    await createUser("lead", "ENGINEER", "Site Engineer");
    await createUser("electrical", "ENGINEER", "Electrical Engineer");
    await createUser("outsider", "ENGINEER", "Civil Engineer");
    await createUser("worker1", "WORKER", "Electrician");
    await createUser("worker2", "WORKER", "Plumber");
    await createUser("accountant", "ACCOUNTANT");
    await createUser("client", "CLIENT");
    await createUser("otherClient", "CLIENT");
  });

  afterAll(async () => {
    if (prisma) {
      const leftovers = await prisma.project.findMany({ where: { OR: [{ id: { in: projectIds } }, { name: { contains: suffix } }] }, select: { id: true } });
      const leftoverIds = leftovers.map((project) => project.id);
      await prisma.auditLog.deleteMany({ where: { OR: [{ projectId: { in: leftoverIds } }, { actorId: { in: userIds } }] } });
      await prisma.notification.deleteMany({ where: { OR: [{ projectId: { in: leftoverIds } }, { userId: { in: userIds } }] } });
      await prisma.project.deleteMany({ where: { id: { in: leftoverIds } } });
      await prisma.authSession.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { impersonatedUserId: { in: userIds } }] } });
      await prisma.clientProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
    await rm(resolve(process.cwd(), ".codex-exec-qa"), { recursive: true, force: true });
  });

  // ------------------------------------------------------------------ teams

  it("migration backfill turns every legacy Project.engineerId into a lead team row (idempotent)", async () => {
    const legacy = await prisma.project.create({ data: { name: `Legacy ${suffix}`, category: "CONSTRUCTION", engineerId: ids.lead } });
    projectIds.push(legacy.id);
    expect(await prisma.projectAssignment.count({ where: { projectId: legacy.id } })).toBe(0);
    const sql = await readFile(resolve(__dirname, "../../../packages/database/prisma/migrations/20260929120000_execution_work_packages/migration.sql"), "utf8");
    const backfill = sql.slice(sql.indexOf('INSERT INTO "ProjectAssignment"')).trim().replace(/;$/, "");
    await prisma.$executeRawUnsafe(backfill);
    await prisma.$executeRawUnsafe(backfill);
    const rows = await prisma.projectAssignment.findMany({ where: { projectId: legacy.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: ids.lead, isLead: true });
    const read = await request(server()).get(`/projects/${legacy.id}`).set("Cookie", cookies.lead as string).expect(200);
    expect(read.body.engineer.id).toBe(ids.lead);
    expect(read.body.engineers.map((engineer: { id: string }) => engineer.id)).toEqual([ids.lead]);
  });

  it("a project holds a lead plus additional engineers and workers, each with a specialty", async () => {
    const created = await request(server())
      .post("/admin/projects")
      .set("Cookie", cookies.admin as string)
      .send({
        name: `Villa ${suffix}`,
        category: "CONSTRUCTION",
        clientId: ids.clientProfile,
        engineerId: ids.lead,
        engineerIds: [ids.electrical, ids.lead],
        workerIds: [ids.worker1],
        phase: "EXECUTION"
      })
      .expect(201);
    ids.project = created.body.id;
    projectIds.push(created.body.id);
    expect(created.body.engineers).toEqual([
      expect.objectContaining({ id: ids.lead, isLead: true, specialty: "Site Engineer" }),
      expect.objectContaining({ id: ids.electrical, isLead: false, specialty: "Electrical Engineer" })
    ]);
    expect(created.body.workers).toEqual([expect.objectContaining({ id: ids.worker1, specialty: "Electrician" })]);
    const rows = await prisma.projectAssignment.findMany({ where: { projectId: ids.project } });
    expect(rows.find((row) => row.userId === ids.lead)?.isLead).toBe(true);
    expect(rows).toHaveLength(3);

    // Every engineer on the team reads the project; an engineer outside it cannot.
    await request(server()).get(`/projects/${ids.project}`).set("Cookie", cookies.electrical as string).expect(200);
    await request(server()).get(`/projects/${ids.project}`).set("Cookie", cookies.outsider as string).expect(403);

    // Only active engineers qualify as engineers.
    await request(server())
      .patch(`/admin/projects/${ids.project}`)
      .set("Cookie", cookies.admin as string)
      .send({ engineerIds: [ids.worker1] })
      .expect(400);

    const other = await request(server())
      .post("/admin/projects")
      .set("Cookie", cookies.admin as string)
      .send({ name: `Other ${suffix}`, category: "FINISHING", clientId: ids.otherClientProfile, engineerId: ids.outsider, phase: "EXECUTION" })
      .expect(201);
    ids.otherProject = other.body.id;
    projectIds.push(other.body.id);
  });

  it("staff specialty is free text on the user record", async () => {
    const created = await request(server())
      .post("/admin/users")
      .set("Cookie", cookies.admin as string)
      .send({ email: `facade-${suffix}${domain}`, displayName: "Facade Installer", role: "WORKER", specialty: "Facade Installer", temporaryPassword: `Temp-${suffix}-9` })
      .expect(201);
    userIds.push(created.body.id);
    expect(created.body.specialty).toBe("Facade Installer");
    const updated = await request(server()).patch(`/admin/users/${created.body.id}`).set("Cookie", cookies.admin as string).send({ specialty: "" }).expect(200);
    expect(updated.body.specialty).toBeNull();
  });

  // -------------------------------------------------------------- execution

  it("Admin creates custom stages in order and validates status, progress and dates", async () => {
    const make = (body: Record<string, unknown>) =>
      request(server()).post(`/projects/${ids.project}/execution/stages`).set("Cookie", cookies.admin as string).send(body);
    const electrical = await make({ name: "أعمال الكهرباء", code: "EL", progress: 45, status: "IN_PROGRESS", plannedStartDate: "2026-10-01", plannedEndDate: "2026-10-10" }).expect(201);
    const plumbing = await make({ name: "Plumbing" }).expect(201);
    const facade = await make({ name: "تركيب الواجهات", status: "COMPLETED", progress: 10 }).expect(201);
    ids.stageElectrical = electrical.body.id;
    ids.stagePlumbing = plumbing.body.id;
    ids.stageFacade = facade.body.id;
    expect([electrical.body.sortOrder, plumbing.body.sortOrder, facade.body.sortOrder]).toEqual([1, 2, 3]);
    expect(electrical.body).toMatchObject({ status: "IN_PROGRESS", progress: 45, plannedStartDate: "2026-10-01", plannedEndDate: "2026-10-10" });
    expect(facade.body.progress).toBe(100); // COMPLETED always means 100%

    await make({ name: "x", progress: 101 }).expect(400);
    await make({ name: "x", progress: 45.5 }).expect(400);
    await make({ name: "x", progress: -1 }).expect(400);
    await make({ name: "x", status: "DONE" }).expect(400);
    await make({ name: "" }).expect(400);
    await make({ name: "x", plannedStartDate: "2026-10-10", plannedEndDate: "2026-10-01" }).expect(400);
    await make({ name: "x", projectId: ids.otherProject }).expect(400);

    const reordered = await request(server())
      .put(`/projects/${ids.project}/execution/stages/order`)
      .set("Cookie", cookies.admin as string)
      .send({ stageIds: [ids.stageFacade, ids.stageElectrical, ids.stagePlumbing] })
      .expect(200);
    expect(reordered.body.stages.map((stage: { id: string }) => stage.id)).toEqual([ids.stageFacade, ids.stageElectrical, ids.stagePlumbing]);
    // The order must name every stage of this project exactly once.
    await request(server())
      .put(`/projects/${ids.project}/execution/stages/order`)
      .set("Cookie", cookies.admin as string)
      .send({ stageIds: [ids.stageFacade, ids.stageElectrical] })
      .expect(400);

    const summary = reordered.body.summary;
    expect(summary).toMatchObject({ total: 3, completed: 1, inProgress: 1, planned: 1, weighting: "EQUAL" });
    expect(summary.executionProgress).toBe(Math.round((100 + 45 + 0) / 3));
    // Execution progress is informative only: the project's own progress is untouched.
    expect(reordered.body.projectProgress).toBe(0);
  });

  it("equal-weight execution progress is explicit and exact", () => {
    expect(executionProgress([])).toBeNull();
    expect(executionProgress([{ progress: 45 }])).toBe(45);
    expect(executionProgress([{ progress: 0 }, { progress: 100 }, { progress: 50 }])).toBe(50);
    expect(executionProgress([{ progress: 33 }, { progress: 34 }])).toBe(34);
  });

  it("stage teams accept only active engineers and workers; new members join the project team", async () => {
    const team = (stageId: string, userIdsBody: unknown[]) =>
      request(server()).put(`/projects/${ids.project}/execution/stages/${stageId}/team`).set("Cookie", cookies.admin as string).send({ userIds: userIdsBody });
    const assigned = await team(ids.stageElectrical, [ids.electrical, ids.worker1, ids.worker2]).expect(200);
    expect(assigned.body.engineers.map((member: { id: string }) => member.id)).toEqual([ids.electrical]);
    expect(assigned.body.workers.map((member: { specialty: string }) => member.specialty).sort()).toEqual(["Electrician", "Plumber"]);
    expect(await prisma.projectAssignment.count({ where: { projectId: ids.project, userId: ids.worker2 } })).toBe(1);

    for (const ineligible of [ids.accountant, ids.client, ids.admin, "missing-user-id"]) {
      await team(ids.stageElectrical, [ids.electrical, ineligible]).expect(400);
    }
    await team(ids.stageElectrical, [ids.worker1, ids.worker1]).expect(400);
    await team(ids.stagePlumbing, [ids.worker2]).expect(200);
  });

  it("RBAC: lead engineer updates any stage, other engineers only their stages, workers read their stages", async () => {
    const patch = (key: string, stageId: string, body: Record<string, unknown>) =>
      request(server()).patch(`/projects/${ids.project}/execution/stages/${stageId}`).set("Cookie", cookies[key] as string).send(body);

    await patch("lead", ids.stagePlumbing, { progress: 20, status: "IN_PROGRESS" }).expect(200);
    await patch("electrical", ids.stageElectrical, { progress: 60, description: "Panel boards installed" }).expect(200);
    await patch("electrical", ids.stagePlumbing, { progress: 30 }).expect(403);
    await patch("electrical", ids.stageElectrical, { name: "Renamed" }).expect(403);
    await patch("electrical", ids.stageElectrical, { plannedEndDate: "2026-12-01" }).expect(403);
    await patch("worker1", ids.stageElectrical, { progress: 70 }).expect(403);
    await patch("client", ids.stageElectrical, { progress: 70 }).expect(403);
    await patch("accountant", ids.stageElectrical, { progress: 70 }).expect(403);
    await patch("outsider", ids.stageElectrical, { progress: 70 }).expect(403);

    for (const key of ["lead", "electrical", "worker1", "client", "accountant"]) {
      await request(server()).post(`/projects/${ids.project}/execution/stages`).set("Cookie", cookies[key] as string).send({ name: "Nope" }).expect(403);
      await request(server()).delete(`/projects/${ids.project}/execution/stages/${ids.stagePlumbing}`).set("Cookie", cookies[key] as string).expect(403);
      await request(server()).put(`/projects/${ids.project}/execution/stages/${ids.stagePlumbing}/team`).set("Cookie", cookies[key] as string).send({ userIds: [] }).expect(403);
    }

    const worker = await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.worker1 as string).expect(200);
    expect(worker.body.stages.map((stage: { id: string }) => stage.id)).toEqual([ids.stageElectrical]);
    const worker2 = await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.worker2 as string).expect(200);
    expect(worker2.body.stages.map((stage: { id: string }) => stage.id).sort()).toEqual([ids.stageElectrical, ids.stagePlumbing].sort());

    const client = await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.client as string).expect(200);
    expect(client.body.stages).toHaveLength(3);
    const clientText = JSON.stringify(client.body);
    expect(clientText).not.toContain("Panel boards installed");
    expect(clientText).not.toContain(ids.electrical);
    expect(client.body.summary.assignedEngineers).toBeUndefined();

    await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.accountant as string).expect(403);
    await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.outsider as string).expect(403);
    await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.otherClient as string).expect(403);
    await request(server()).get(`/projects/${ids.project}/execution`).expect(401);

    const lead = await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.lead as string).expect(200);
    expect(lead.body.permissions).toEqual({ manage: false, updateAny: true });
    expect(lead.body.summary).toMatchObject({ assignedEngineers: 1, assignedWorkers: 2 });
  });

  it("cross-project IDOR: a stage id from another project is never reachable through this project", async () => {
    const foreign = await request(server())
      .post(`/projects/${ids.otherProject}/execution/stages`)
      .set("Cookie", cookies.admin as string)
      .send({ name: "Foreign stage" })
      .expect(201);
    ids.foreignStage = foreign.body.id;
    const base = `/projects/${ids.project}/execution/stages/${ids.foreignStage}`;
    await request(server()).get(base).set("Cookie", cookies.admin as string).expect(404);
    await request(server()).patch(base).set("Cookie", cookies.admin as string).send({ progress: 99 }).expect(404);
    await request(server()).put(`${base}/team`).set("Cookie", cookies.admin as string).send({ userIds: [] }).expect(404);
    await request(server()).delete(base).set("Cookie", cookies.admin as string).expect(404);
    await request(server())
      .put(`/projects/${ids.project}/execution/stages/order`)
      .set("Cookie", cookies.admin as string)
      .send({ stageIds: [ids.stageFacade, ids.stageElectrical, ids.foreignStage] })
      .expect(400);
    // Lead engineer of this project cannot touch the other project's stage via its own URL.
    await request(server()).patch(`/projects/${ids.otherProject}/execution/stages/${ids.foreignStage}`).set("Cookie", cookies.lead as string).send({ progress: 5 }).expect(403);
    expect((await prisma.executionStage.findUniqueOrThrow({ where: { id: ids.foreignStage } })).progress).toBe(0);
  });

  it("site activity links to a stage of the same project; detail shows it with history", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const upload = (key: string, stageId: string) =>
      request(server())
        .post(`/projects/${ids.project}/site-updates`)
        .set("Cookie", cookies[key] as string)
        .field("note", "Conduits fixed")
        .field("executionStageId", stageId)
        .attach("media", jpeg, { filename: "site.jpg", contentType: "image/jpeg" });
    await upload("worker1", ids.stageElectrical).expect(201);
    await upload("worker1", ids.stagePlumbing).expect(403); // not assigned to that stage
    await upload("worker1", ids.foreignStage).expect(400); // other project's stage

    const detail = await request(server()).get(`/projects/${ids.project}/execution/stages/${ids.stageElectrical}`).set("Cookie", cookies.admin as string).expect(200);
    expect(detail.body.siteUpdates).toHaveLength(1);
    expect(detail.body.siteUpdates[0].note).toBe("Conduits fixed");
    const actions = detail.body.history.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(["execution.stage_created", "execution.stage_team_updated", "execution.stage_progress_updated"]));

    // A worker cannot open a stage they are not assigned to.
    await request(server()).get(`/projects/${ids.project}/execution/stages/${ids.stagePlumbing}`).set("Cookie", cookies.worker1 as string).expect(404);
  });

  it("deleting a stage removes its assignments but keeps the field history (link cleared)", async () => {
    const temp = await request(server()).post(`/projects/${ids.project}/execution/stages`).set("Cookie", cookies.admin as string).send({ name: "Temp stage" }).expect(201);
    await request(server()).put(`/projects/${ids.project}/execution/stages/${temp.body.id}/team`).set("Cookie", cookies.admin as string).send({ userIds: [ids.worker1] }).expect(200);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const update = await request(server())
      .post(`/projects/${ids.project}/site-updates`)
      .set("Cookie", cookies.admin as string)
      .field("executionStageId", temp.body.id)
      .attach("media", jpeg, { filename: "s.jpg", contentType: "image/jpeg" })
      .expect(201);
    await request(server()).delete(`/projects/${ids.project}/execution/stages/${temp.body.id}`).set("Cookie", cookies.admin as string).expect(200);
    expect(await prisma.executionStage.count({ where: { id: temp.body.id } })).toBe(0);
    expect(await prisma.executionStageAssignment.count({ where: { stageId: temp.body.id } })).toBe(0);
    const kept = await prisma.siteUpdate.findUniqueOrThrow({ where: { id: update.body.id } });
    expect(kept.executionStageId).toBeNull();
  });

  it("removing an engineer from the project team also ends their stage assignments; lead can change", async () => {
    await request(server()).patch(`/admin/projects/${ids.project}`).set("Cookie", cookies.admin as string).send({ engineerIds: [] }).expect(200);
    expect(await prisma.projectAssignment.count({ where: { projectId: ids.project, userId: ids.electrical } })).toBe(0);
    expect(await prisma.executionStageAssignment.count({ where: { userId: ids.electrical, stage: { projectId: ids.project } } })).toBe(0);
    await request(server()).get(`/projects/${ids.project}/execution`).set("Cookie", cookies.electrical as string).expect(403);

    const switched = await request(server())
      .patch(`/admin/projects/${ids.project}`)
      .set("Cookie", cookies.admin as string)
      .send({ engineerId: ids.electrical, engineerIds: [ids.lead] })
      .expect(200);
    expect(switched.body.engineer.id).toBe(ids.electrical);
    expect(switched.body.engineers.map((engineer: { id: string; isLead: boolean }) => [engineer.id, engineer.isLead])).toEqual([
      [ids.electrical, true],
      [ids.lead, false]
    ]);
    const leads = await prisma.projectAssignment.findMany({ where: { projectId: ids.project, isLead: true } });
    expect(leads.map((row) => row.userId)).toEqual([ids.electrical]);
    // Workers were not sent, so they stay.
    expect(await prisma.projectAssignment.count({ where: { projectId: ids.project, userId: ids.worker1 } })).toBe(1);
  });

  it("performance: 30 stages x 10 engineers x 50 workers load in one bounded request", async () => {
    const engineers = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        prisma.user.create({ data: { email: `perf-eng-${index}-${suffix}${domain}`, displayName: `Eng ${index}`, role: "ENGINEER", specialty: "MEP Engineer" } })
      )
    );
    const workers = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        prisma.user.create({ data: { email: `perf-wrk-${index}-${suffix}${domain}`, displayName: `Worker ${index}`, role: "WORKER", specialty: "Mason" } })
      )
    );
    userIds.push(...engineers.map((user) => user.id), ...workers.map((user) => user.id));
    const project = await prisma.project.create({ data: { name: `Perf ${suffix}`, category: "CONSTRUCTION", phase: "EXECUTION" } });
    projectIds.push(project.id);
    for (let index = 0; index < 30; index += 1) {
      await prisma.executionStage.create({
        data: {
          projectId: project.id,
          name: `Package ${index}`,
          sortOrder: index,
          progress: index * 3,
          assignments: {
            create: [
              { userId: (engineers[index % 10] as { id: string }).id },
              ...workers.slice((index * 5) % 50, ((index * 5) % 50) + 5).map((worker) => ({ userId: worker.id }))
            ]
          }
        }
      });
    }
    const started = performance.now();
    const response = await request(server()).get(`/projects/${project.id}/execution`).set("Cookie", cookies.admin as string).expect(200);
    const elapsed = performance.now() - started;
    expect(response.body.stages).toHaveLength(30);
    expect(response.body.summary).toMatchObject({ total: 30, assignedEngineers: 10, assignedWorkers: 50 });
    expect(response.body.stages[0].workers).toHaveLength(5);
    expect(elapsed).toBeLessThan(2000);
  });

  // ------------------------------------------------------------ hard delete

  it("project deletion: preflight counts come from the database; non-admins are refused", async () => {
    const project = await prisma.project.create({
      data: { name: `Doomed ${suffix}`, code: `DEL-${suffix.slice(-6).toUpperCase()}`, category: "MIXED", clientId: ids.clientProfile, engineerId: ids.lead }
    });
    ids.doomed = project.id;
    projectIds.push(project.id);
    const graph = await seedProjectGraph(project.id, ids.admin, ids.client);
    ids.doomedFiles = JSON.stringify(graph.files);

    const impact = await request(server()).get(`/admin/projects/${project.id}/deletion-impact`).set("Cookie", cookies.admin as string).expect(200);
    expect(impact.body.confirmationPhrase).toBe(project.code);
    expect(impact.body.impact).toMatchObject({
      projects: 1,
      executionStages: 1,
      executionStageAssignments: 1,
      siteUpdates: 1,
      siteMedia: 1,
      designs: 1,
      designRevisions: 1,
      designEvents: 1,
      documents: 1,
      documentVersions: 1,
      financialProfiles: 1,
      costEstimates: 1,
      costEstimateItems: 1,
      boqItems: 1,
      expenses: 1,
      clientPayments: 1,
      contractorPayments: 1,
      financialAttachments: 1,
      chatMessages: 2,
      chatReadStates: 1,
      notifications: 1,
      activityEntries: 1,
      files: 5,
      fileBytes: 35
    });

    for (const key of ["lead", "accountant", "worker1", "client"]) {
      await request(server()).get(`/admin/projects/${project.id}/deletion-impact`).set("Cookie", cookies[key] as string).expect(403);
      await request(server()).delete(`/admin/projects/${project.id}`).set("Cookie", cookies[key] as string).send({ confirmation: project.code }).expect(403);
    }
    await request(server()).delete(`/admin/projects/${project.id}`).send({ confirmation: project.code }).expect(401);
    await request(server()).delete(`/admin/projects/${project.id}`).set("Cookie", cookies.admin as string).send({ confirmation: "WRONG" }).expect(400);
    await request(server()).delete(`/admin/projects/${project.id}`).set("Cookie", cookies.admin as string).send({}).expect(400);
    await request(server()).delete(`/admin/projects/not-a-real-id`).set("Cookie", cookies.admin as string).send({ confirmation: project.code }).expect(404);
    // A browser-supplied path is not an accepted field.
    await request(server()).delete(`/admin/projects/${project.id}`).set("Cookie", cookies.admin as string).send({ confirmation: project.code, storagePath: "../../etc" }).expect(400);
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(1);
    for (const file of graph.files) expect(existsSync(join(storageRoot, file))).toBe(true);
  });

  it("project deletion: a failing database transaction restores every quarantined file", async () => {
    const files = JSON.parse(ids.doomedFiles) as string[];
    const before = await projectRowCounts(ids.doomed);
    const spy = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("simulated database failure"));
    const code = (await prisma.project.findUniqueOrThrow({ where: { id: ids.doomed } })).code as string;
    await request(server()).delete(`/admin/projects/${ids.doomed}`).set("Cookie", cookies.admin as string).send({ confirmation: code }).expect(500);
    spy.mockRestore();
    expect(await projectRowCounts(ids.doomed)).toBe(before);
    for (const file of files) expect(existsSync(join(storageRoot, file))).toBe(true);
    const quarantine = join(storageRoot, ".deleted");
    expect(existsSync(quarantine) ? await readdir(quarantine) : []).toEqual([]);
  });

  it("project deletion: every project row and file disappears; people and other projects remain", async () => {
    const files = JSON.parse(ids.doomedFiles) as string[];
    const project = await prisma.project.findUniqueOrThrow({ where: { id: ids.doomed } });
    const otherBefore = await projectRowCounts(ids.project);
    const result = await request(server())
      .delete(`/admin/projects/${project.id}`)
      .set("Cookie", cookies.admin as string)
      .send({ confirmation: (project.code as string).toLowerCase() })
      .expect(200);
    expect(result.body.storage).toEqual({ status: "complete", filesRemoved: 5, failedPaths: [] });
    expect(await projectRowCounts(project.id)).toBe(0);
    for (const file of files) expect(existsSync(join(storageRoot, file))).toBe(false);
    expect(existsSync(join(storageRoot, "projects", project.id))).toBe(false);
    expect(existsSync(join(storageRoot, ".deleted")) ? await readdir(join(storageRoot, ".deleted")) : []).toEqual([]);
    // Assigned staff and the client account are untouched; so is every other project.
    expect(await prisma.user.count({ where: { id: { in: [ids.lead, ids.worker1, ids.client, ids.admin] } } })).toBe(4);
    expect(await prisma.clientProfile.count({ where: { id: ids.clientProfile } })).toBe(1);
    expect(await projectRowCounts(ids.project)).toBe(otherBefore);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "project.deleted_permanently", actorId: ids.admin } });
    expect(audit.projectId).toBeNull();
    expect(await request(server()).get(`/projects/${project.id}`).set("Cookie", cookies.admin as string).then((response) => response.status)).toBe(404);
  });

  it("client deletion: impact lists owned projects; blockers, confirmation and stale impact are enforced", async () => {
    const owner = await createUser("doomedClient", "CLIENT");
    const first = await prisma.project.create({ data: { name: `DC-A ${suffix}`, code: `DCA-${suffix.slice(-6).toUpperCase()}`, category: "DESIGN", clientId: ids.doomedClientProfile, engineerId: ids.lead } });
    const second = await prisma.project.create({ data: { name: `DC-B ${suffix}`, code: `DCB-${suffix.slice(-6).toUpperCase()}`, category: "DESIGN", clientId: ids.doomedClientProfile } });
    projectIds.push(first.id, second.id);
    const graphA = await seedProjectGraph(first.id, ids.admin, owner.id);
    const graphB = await seedProjectGraph(second.id, ids.admin, owner.id);
    ids.doomedClientFiles = JSON.stringify([...graphA.files, ...graphB.files]);
    ids.doomedClientProjects = JSON.stringify([first.id, second.id]);

    const impact = await request(server()).get(`/admin/clients/${ids.doomedClientProfile}/deletion-impact`).set("Cookie", cookies.admin as string).expect(200);
    expect(impact.body.projects.map((project: { id: string }) => project.id).sort()).toEqual([first.id, second.id].sort());
    expect(impact.body.impact).toMatchObject({ projects: 2, userAccounts: 1, siteUpdates: 2, designs: 2, documents: 2, chatMessages: 4, files: 10 });
    expect(impact.body.impact.sessions).toBeGreaterThanOrEqual(1);
    expect(impact.body.blockers.total).toBe(0);
    expect(impact.body.confirmationPhrase).toBe("DELETE");

    for (const key of ["lead", "accountant", "worker1", "client", "doomedClient"]) {
      await request(server()).get(`/admin/clients/${ids.doomedClientProfile}/deletion-impact`).set("Cookie", cookies[key] as string).expect(403);
      await request(server()).delete(`/admin/clients/${ids.doomedClientProfile}`).set("Cookie", cookies[key] as string).send({ confirmation: "DELETE", acknowledgedProjectCount: 2 }).expect(403);
    }
    await request(server()).delete(`/admin/clients/${ids.doomedClientProfile}`).set("Cookie", cookies.admin as string).send({ confirmation: "KEEP", acknowledgedProjectCount: 2 }).expect(400);
    await request(server()).delete(`/admin/clients/${ids.doomedClientProfile}`).set("Cookie", cookies.admin as string).send({ confirmation: "DELETE", acknowledgedProjectCount: 1 }).expect(409);
    await request(server()).delete(`/admin/clients/${ids.doomedClientProfile}`).set("Cookie", cookies.admin as string).send({ confirmation: "DELETE" }).expect(409);
    await request(server()).delete(`/admin/clients/missing-client`).set("Cookie", cookies.admin as string).send({ confirmation: "DELETE", acknowledgedProjectCount: 0 }).expect(404);

    // A record this client authored inside another client's project blocks deletion.
    const foreignMessage = await prisma.projectMessage.create({ data: { projectId: ids.otherProject, authorId: owner.id, type: "TEXT", text: "cross" } });
    const blocked = await request(server()).get(`/admin/clients/${ids.doomedClientProfile}/deletion-impact`).set("Cookie", cookies.admin as string).expect(200);
    expect(blocked.body.blockers).toMatchObject({ chatMessages: 1, total: 1 });
    await request(server()).delete(`/admin/clients/${ids.doomedClientProfile}`).set("Cookie", cookies.admin as string).send({ confirmation: "DELETE", acknowledgedProjectCount: 2 }).expect(409);
    await prisma.projectMessage.delete({ where: { id: foreignMessage.id } });
    expect(await prisma.clientProfile.count({ where: { id: ids.doomedClientProfile } })).toBe(1);
  });

  it("client deletion: profile, user, sessions, owned projects and files are removed; everyone else remains", async () => {
    const files = JSON.parse(ids.doomedClientFiles) as string[];
    const doomedProjects = JSON.parse(ids.doomedClientProjects) as string[];
    const otherClientBefore = await projectRowCounts(ids.otherProject);
    const result = await request(server())
      .delete(`/admin/clients/${ids.doomedClientProfile}`)
      .set("Cookie", cookies.admin as string)
      .send({ confirmation: "delete", acknowledgedProjectCount: 2 })
      .expect(200);
    expect(result.body.deleted.projects).toBe(2);
    expect(result.body.storage.status).toBe("complete");
    expect(await prisma.clientProfile.count({ where: { id: ids.doomedClientProfile } })).toBe(0);
    expect(await prisma.user.count({ where: { id: ids.doomedClient } })).toBe(0);
    expect(await prisma.authSession.count({ where: { OR: [{ userId: ids.doomedClient }, { impersonatedUserId: ids.doomedClient }] } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: ids.doomedClient } })).toBe(0);
    for (const projectId of doomedProjects) expect(await projectRowCounts(projectId)).toBe(0);
    for (const file of files) expect(existsSync(join(storageRoot, file))).toBe(false);
    await request(server()).get("/auth/me").set("Cookie", cookies.doomedClient as string).expect(401);

    // Unrelated staff, clients and their projects are untouched.
    expect(await prisma.user.count({ where: { id: { in: [ids.admin, ids.lead, ids.electrical, ids.worker1, ids.worker2, ids.accountant, ids.client, ids.otherClient] as string[] } } })).toBe(8);
    expect(await prisma.clientProfile.count({ where: { id: { in: [ids.clientProfile, ids.otherClientProfile] as string[] } } })).toBe(2);
    expect(await projectRowCounts(ids.otherProject)).toBe(otherClientBefore);
    expect(await prisma.project.count({ where: { id: ids.project } })).toBe(1);
    userIds.splice(userIds.indexOf(ids.doomedClient), 1);
  });

  // ---------------------------------------------------------- client password

  it("client password: 8-digit temporary password, '12345678' accepted, 7 characters refused, reset revokes", async () => {
    const created = await request(server())
      .post("/admin/clients")
      .set("Cookie", cookies.admin as string)
      .send({ displayName: `Numeric ${suffix}`, email: `numeric-${suffix}${domain}`, phone: "01012345678" })
      .expect(201);
    userIds.push(created.body.user.id);
    const temporary = created.body.generatedCredentials.temporaryPassword as string;
    expect(temporary).toMatch(/^[0-9]{8}$/);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.body.user.id } });
    expect(stored.passwordHash).not.toContain(temporary);

    const session = await login(created.body.user.email, temporary);
    const change = (newPassword: string, currentPassword = temporary) =>
      request(server()).post("/auth/password/change").set("Cookie", session).send({ currentPassword, newPassword });
    const tooShort = await change("1234567").expect(400);
    expect(tooShort.body.reason).toBe("too_short");
    await change("12345678").expect(200);
    await login(created.body.user.email, "12345678");

    const other = await login(created.body.user.email, "12345678");
    const reset = await request(server()).post(`/admin/clients/${created.body.id}/reset-password`).set("Cookie", cookies.admin as string).send({}).expect(200);
    expect(reset.body.temporaryPassword).toMatch(/^[0-9]{8}$/);
    expect(reset.body.sessionsRevoked).toBeGreaterThanOrEqual(2);
    await request(server()).get("/auth/me").set("Cookie", other).expect(401);
    await request(server()).post("/auth/login").send({ email: created.body.user.email, password: "12345678" }).expect(401);
    await login(created.body.user.email, reset.body.temporaryPassword);
    const audit = JSON.stringify(await prisma.auditLog.findMany({ where: { metadata: { path: ["targetUserId"], equals: created.body.user.id } } }));
    expect(audit).not.toContain(reset.body.temporaryPassword);
    expect(audit).not.toContain(temporary);

    // Staff policy is unchanged: 12345678 is still too weak for an employee account.
    const staff = await request(server()).post("/auth/password/change").set("Cookie", cookies.worker2 as string).send({ currentPassword: password, newPassword: "12345678" }).expect(400);
    expect(staff.body.code).toBe("PASSWORD_POLICY");
  });
});
