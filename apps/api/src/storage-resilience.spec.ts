import { INestApplication, NotFoundException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { PrismaService } from "./shared/prisma.service";
import { StorageService } from "./modules/projects/storage.service";

/**
 * A database record whose file is missing on disk (restored backup, manual cleanup,
 * failed copy) used to crash the API: the read stream's ENOENT 'error' event was
 * unhandled and terminated the process. Downloads must answer 404 and the server
 * must keep serving.
 */
describe("storage resilience — missing stored files", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `storage-admin-${suffix}@storage.test.elhabak.local`;
  const password = `Storage-${suffix}-Pass9`;
  let cookie = "";
  let userId = "";
  let projectId = "";
  let mediaId = "";

  beforeAll(async () => {
    const { AppModule } = await import("./modules/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: { email, displayName: "Storage Admin", role: "ADMIN", passwordHash: await hash(password, 12) }
    });
    userId = admin.id;
    const project = await prisma.project.create({ data: { name: `Storage QA ${suffix}`, category: "CONSTRUCTION" } });
    projectId = project.id;
    const update = await prisma.siteUpdate.create({ data: { projectId, authorId: userId, note: "missing file fixture" } });
    const media = await prisma.siteMedia.create({
      data: {
        siteUpdateId: update.id,
        projectId,
        uploaderId: userId,
        mediaType: "IMAGE",
        storagePath: `projects/${projectId}/site-updates/does-not-exist-${suffix}.jpg`,
        storedFilename: `does-not-exist-${suffix}.jpg`,
        originalFilename: "gone.jpg",
        mimeType: "image/jpeg",
        fileSize: 1234
      }
    });
    mediaId = media.id;

    const login = await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);
    const setCookie = login.headers["set-cookie"];
    cookie = String(Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0] as string;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.siteMedia.deleteMany({ where: { projectId } });
      await prisma.siteUpdate.deleteMany({ where: { projectId } });
      await prisma.auditLog.deleteMany({ where: { actorId: userId } });
      await prisma.project.deleteMany({ where: { id: projectId } });
      await prisma.authSession.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await app?.close();
  });

  it("StorageService rejects a missing file with NotFound instead of a crashing stream", async () => {
    const storage = app.get(StorageService);
    await expect(storage.open(`projects/${projectId}/nope-${suffix}.jpg`)).rejects.toBeInstanceOf(NotFoundException);
    await expect(storage.statSize(`projects/${projectId}/nope-${suffix}.jpg`)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("a download of a record whose file is gone answers 404 and the API keeps serving", async () => {
    const server = app.getHttpServer();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(server).get(`/projects/${projectId}/media/${mediaId}`).set("Cookie", cookie).expect(404);
    }
    await request(server).get("/health").expect(200);
    await request(server).get("/auth/me").set("Cookie", cookie).expect(200);
  });
});
