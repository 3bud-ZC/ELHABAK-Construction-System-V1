#!/usr/bin/env node
// ELHABAK synthetic load-test dataset — seed or remove.
//
//   node scripts/loadtest/dataset.mjs seed      (requires LOADTEST_PASSWORD)
//   node scripts/loadtest/dataset.mjs cleanup
//
// Safety: DATABASE_URL must be a loopback PostgreSQL database named elhabak_test or
// elhabak_test_*, OR its database name must equal LOADTEST_ALLOW_DB (used only for the
// isolated staging database, never production). Every synthetic row is identifiable:
// users @loadtest.elhabak.local, projects coded LT-*. `cleanup` removes exactly those.
// Files are written under STORAGE_ROOT/projects/<LT project id>/… and removed on cleanup.
import { createRequire } from "node:module";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const require = createRequire(join(ROOT, "packages/database/package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = createRequire(join(ROOT, "apps/api/package.json"))("bcryptjs");

const DOMAIN = "@loadtest.elhabak.local";
const SHARED_DIR = "lt-shared";
const mode = process.argv[2];
if (!["seed", "cleanup"].includes(mode)) {
  console.error("usage: dataset.mjs seed|cleanup");
  process.exit(2);
}

const url = new URL(process.env.DATABASE_URL ?? "");
const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
const allowed = (loopback && (database === "elhabak_test" || database.startsWith("elhabak_test_"))) || (loopback && database === process.env.LOADTEST_ALLOW_DB);
if (!allowed || database === "elhabak") {
  console.error(`Refusing: ${database} on ${url.hostname} is not an isolated load-test database.`);
  process.exit(2);
}

const scale = Number(process.env.LOADTEST_SCALE ?? 1);
const COUNTS = {
  admins: 2,
  engineers: Math.round(40 * scale),
  accountants: Math.round(8 * scale),
  workers: Math.round(50 * scale),
  clients: Math.round(900 * scale),
  projects: Math.round(400 * scale),
  updatesPerProject: 40,
  auditPerProject: 20,
  messagesPerProject: 60,
  notificationsPerUser: 30,
  documentsPerProject: 5,
  designsPerProject: 3
};

const prisma = new PrismaClient();
const storageRoot = resolve(process.env.STORAGE_ROOT ?? join(ROOT, "storage"));
const id = () => `lt${randomUUID().replace(/-/g, "").slice(0, 23)}`;
const daysAgo = (days) => new Date(Date.now() - days * 86_400_000);
const pick = (list, index) => list[index % list.length];

async function batched(model, rows, size = 1000) {
  for (let offset = 0; offset < rows.length; offset += size) {
    await prisma[model].createMany({ data: rows.slice(offset, offset + size) });
  }
}

async function seed() {
  const password = process.env.LOADTEST_PASSWORD;
  if (!password || password.length < 12) throw new Error("Set LOADTEST_PASSWORD (12+ chars); it is never printed or stored.");
  if (await prisma.user.count({ where: { email: { endsWith: DOMAIN } } })) throw new Error("Load-test data already present; run cleanup first.");
  const passwordHash = await bcrypt.hash(password, 12);
  const started = Date.now();

  const users = [];
  const make = (role, count) =>
    Array.from({ length: count }, (_, index) => {
      const user = { id: id(), email: `lt-${role.toLowerCase()}-${index + 1}${DOMAIN}`, displayName: `LT ${role} ${index + 1}`, role, passwordHash, isActive: true, createdAt: daysAgo(400 - (index % 400)) };
      users.push(user);
      return user;
    });
  make("ADMIN", COUNTS.admins);
  const engineers = make("ENGINEER", COUNTS.engineers);
  make("ACCOUNTANT", COUNTS.accountants);
  const workers = make("WORKER", COUNTS.workers);
  const clientUsers = make("CLIENT", COUNTS.clients);
  await batched("user", users);
  const clients = clientUsers.map((user, index) => ({ id: id(), userId: user.id, phone: `+2010${String(10_000_000 + index).slice(-8)}`, createdAt: user.createdAt }));
  await batched("clientProfile", clients);

  const phases = ["SITE_INSPECTION", "DESIGN", "PRELIMINARY_ESTIMATION", "EXECUTION", "INITIAL_HANDOVER", "FINAL_HANDOVER"];
  const projects = Array.from({ length: COUNTS.projects }, (_, index) => ({
    id: id(),
    code: `LT-${String(index + 1).padStart(4, "0")}`,
    name: `LT Project ${index + 1}`,
    category: pick(["DESIGN", "CONSTRUCTION", "FINISHING", "GENERAL_CONTRACTING", "FURNITURE", "MIXED"], index),
    phase: pick(phases, index),
    status: index % 10 === 0 ? "COMPLETED" : "ACTIVE",
    progress: (index * 7) % 100,
    clientId: pick(clients, index).id,
    engineerId: pick(engineers, index).id,
    location: `LT Site ${index % 25}`,
    createdAt: daysAgo(365 - (index % 365))
  }));
  await batched("project", projects);
  await batched("projectAssignment", projects.flatMap((project, index) => [0, 1].map((k) => ({ id: id(), projectId: project.id, userId: pick(workers, index * 2 + k).id }))));

  // Real files for the first projects so protected downloads can be exercised.
  const image = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(250 * 1024), Buffer.from([0xff, 0xd9])]);
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), randomBytes(600 * 1024), Buffer.from("\n%%EOF\n")]);
  // One shared real image and PDF back every synthetic media/document record, so
  // protected downloads stream real bytes without writing thousands of files.
  const sharedDir = join(storageRoot, "projects", SHARED_DIR);
  await mkdir(sharedDir, { recursive: true });
  await writeFile(join(sharedDir, "lt-image.jpg"), image);
  await writeFile(join(sharedDir, "lt-document.pdf"), pdf);

  const types = ["PROGRESS", "INSPECTION", "ISSUE", "MATERIAL", "GENERAL"];
  const updates = [];
  const media = [];
  projects.forEach((project, p) => {
    for (let u = 0; u < COUNTS.updatesPerProject; u += 1) {
      const update = { id: id(), projectId: project.id, authorId: project.engineerId, type: pick(types, u), phase: project.phase, isClientVisible: u % 4 !== 0, note: `LT field note ${u} for ${project.code}`, createdAt: daysAgo(360 - u * 9 - (p % 5)) };
      updates.push(update);
      if (u >= COUNTS.updatesPerProject - 2) {
        media.push({ id: id(), siteUpdateId: update.id, projectId: project.id, uploaderId: project.engineerId, mediaType: "IMAGE", storagePath: `projects/${SHARED_DIR}/lt-image.jpg`, storedFilename: "lt-image.jpg", originalFilename: "site.jpg", mimeType: "image/jpeg", fileSize: image.length, createdAt: update.createdAt });
      }
    }
  });
  await batched("siteUpdate", updates);
  await batched("siteMedia", media);

  await batched("auditLog", projects.flatMap((project, p) => Array.from({ length: COUNTS.auditPerProject }, (_, a) => ({ id: id(), actorId: project.engineerId, projectId: project.id, action: pick(["project.progress_changed", "project.phase_changed", "site_update.submitted", "project.created"], a), metadata: { from: a, to: a + 1 }, createdAt: daysAgo(350 - a * 15 - (p % 7)) }))));

  await batched("projectMessage", projects.flatMap((project, p) => Array.from({ length: COUNTS.messagesPerProject }, (_, m) => {
    const clientUser = clientUsers[p % clientUsers.length];
    return { id: id(), projectId: project.id, authorId: m % 3 === 0 ? clientUser.id : project.engineerId, type: "TEXT", text: `LT message ${m} on ${project.code}`, createdAt: daysAgo(300 - m * 4 - (p % 3)) };
  })));

  await batched("notification", users.flatMap((user, u) => Array.from({ length: COUNTS.notificationsPerUser }, (_, n) => ({ id: id(), userId: user.id, projectId: pick(projects, u + n).id, type: pick(["CHAT_MESSAGE", "SITE_UPDATE", "DOCUMENT_SHARED", "PROJECT_PROGRESS_CHANGED"], n), title: `LT notification ${n}`, readAt: n % 3 === 0 ? null : daysAgo(n), createdAt: daysAgo(n * 3) }))));

  const documents = [];
  const versions = [];
  projects.forEach((project) => {
    for (let d = 0; d < COUNTS.documentsPerProject; d += 1) {
      const document = { id: id(), projectId: project.id, reference: `${project.code}-DOC-${d + 1}`, title: `LT Document ${d + 1} ${project.code}`, category: pick(["CONTRACT", "PERMIT", "REPORT", "CORRESPONDENCE", "HANDOVER", "OTHER"], d), createdById: project.engineerId, isClientVisible: d % 2 === 0, createdAt: daysAgo(200 - d * 10) };
      documents.push(document);
      versions.push({ id: id(), documentId: document.id, projectId: project.id, versionNumber: 1, storagePath: `projects/${SHARED_DIR}/lt-document.pdf`, storedFilename: "lt-document.pdf", originalFilename: "document.pdf", mimeType: "application/pdf", extension: ".pdf", fileSize: pdf.length, checksumSha256: createHash("sha256").update(pdf).digest("hex"), uploadedById: project.engineerId, createdAt: document.createdAt });
    }
  });
  await batched("projectDocument", documents);
  await batched("projectDocumentVersion", versions);

  const designs = [];
  const revisions = [];
  projects.forEach((project) => {
    for (let d = 0; d < COUNTS.designsPerProject; d += 1) {
      const design = { id: id(), projectId: project.id, title: `LT Design ${d + 1} ${project.code}`, discipline: pick(["ARCHITECTURAL", "STRUCTURAL", "INTERIOR", "ELECTRICAL"], d), status: pick(["DRAFT", "IN_REVIEW", "APPROVED"], d) };
      designs.push(design);
      revisions.push({ id: id(), designId: design.id, projectId: project.id, revisionNumber: 1, storagePath: `projects/${project.id}/designs/missing-${d}.pdf`, storedFilename: "rev.pdf", originalFilename: "rev.pdf", mimeType: "application/pdf", fileSize: 1024, uploaderId: project.engineerId });
    }
  });
  await batched("designItem", designs);
  await batched("designRevision", revisions);

  const summary = { users: users.length, clients: clients.length, projects: projects.length, siteUpdates: updates.length, media: media.length, auditLogs: projects.length * COUNTS.auditPerProject, messages: projects.length * COUNTS.messagesPerProject, notifications: users.length * COUNTS.notificationsPerUser, documents: documents.length, designs: designs.length, seconds: Math.round((Date.now() - started) / 1000) };
  console.log(JSON.stringify(summary));
}

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  const projects = await prisma.project.findMany({ where: { code: { startsWith: "LT-" } }, select: { id: true } });
  const projectIds = projects.map((project) => project.id);
  const byProject = { projectId: { in: projectIds } };
  // Children first (FK order), everything scoped to the synthetic projects/users.
  await prisma.designEvent.deleteMany({ where: { design: byProject } });
  await prisma.designRevision.deleteMany({ where: byProject });
  await prisma.designItem.deleteMany({ where: byProject });
  await prisma.projectDocumentVersion.deleteMany({ where: byProject });
  await prisma.projectDocument.deleteMany({ where: byProject });
  await prisma.notification.deleteMany({ where: { OR: [{ userId: { in: userIds } }, byProject] } });
  await prisma.projectChatReadState.deleteMany({ where: { OR: [{ userId: { in: userIds } }, byProject] } });
  await prisma.projectMessage.deleteMany({ where: byProject });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, byProject] } });
  await prisma.siteMedia.deleteMany({ where: byProject });
  await prisma.siteUpdate.deleteMany({ where: byProject });
  await prisma.projectAssignment.deleteMany({ where: byProject });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.clientProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  for (const projectId of projectIds) await rm(join(storageRoot, "projects", projectId), { recursive: true, force: true });
  await rm(join(storageRoot, "projects", SHARED_DIR), { recursive: true, force: true });
  console.log(JSON.stringify({ removedUsers: userIds.length, removedProjects: projectIds.length }));
}

try {
  if (mode === "seed") await seed();
  else await cleanup();
} finally {
  await prisma.$disconnect();
}
