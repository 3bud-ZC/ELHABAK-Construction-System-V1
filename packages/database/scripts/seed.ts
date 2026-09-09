import { config } from "dotenv";
import { hash } from "bcryptjs";
import { PrismaClient, type UserRole } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database URL is required.");
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } }
});

type DemoUser = {
  email: string;
  displayName: string;
  role: UserRole;
  passwordEnv: string;
};

const demoUsers: DemoUser[] = [
  {
    email: "demo.admin@elhabak.local",
    displayName: "Demo Admin",
    role: "ADMIN",
    passwordEnv: "DEMO_ADMIN_PASSWORD"
  },
  {
    email: "demo.engineer@elhabak.local",
    displayName: "Demo Engineer",
    role: "ENGINEER",
    passwordEnv: "DEMO_ENGINEER_PASSWORD"
  },
  {
    email: "demo.accountant@elhabak.local",
    displayName: "Demo Accountant",
    role: "ACCOUNTANT",
    passwordEnv: "DEMO_ACCOUNTANT_PASSWORD"
  },
  {
    email: "demo.worker@elhabak.local",
    displayName: "Demo Worker",
    role: "WORKER",
    passwordEnv: "DEMO_WORKER_PASSWORD"
  },
  {
    email: "demo.client@elhabak.local",
    displayName: "Demo Client",
    role: "CLIENT",
    passwordEnv: "DEMO_CLIENT_PASSWORD"
  }
];

async function main() {
  for (const demoUser of demoUsers) {
    const password = process.env[demoUser.passwordEnv];

    if (!password || password.length < 10) {
      throw new Error(`${demoUser.passwordEnv} must be set in local environment.`);
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        displayName: demoUser.displayName,
        role: demoUser.role,
        isActive: true,
        passwordHash
      },
      create: {
        email: demoUser.email,
        displayName: demoUser.displayName,
        role: demoUser.role,
        isActive: true,
        passwordHash
      }
    });
  }

  const clientUser = await prisma.user.findUniqueOrThrow({
    where: { email: "demo.client@elhabak.local" }
  });

  await prisma.clientProfile.upsert({
    where: { userId: clientUser.id },
    update: {
      phone: "+20 000 000 0000",
      notes: "Demo client profile for MVP verification only."
    },
    create: {
      userId: clientUser.id,
      phone: "+20 000 000 0000",
      notes: "Demo client profile for MVP verification only."
    }
  });

  const demoClient = await prisma.clientProfile.findUniqueOrThrow({
    where: { userId: clientUser.id }
  });
  const demoEngineer = await prisma.user.findUniqueOrThrow({
    where: { email: "demo.engineer@elhabak.local" }
  });
  const demoWorker = await prisma.user.findUniqueOrThrow({
    where: { email: "demo.worker@elhabak.local" }
  });

  const demoProject = await prisma.project.upsert({
    where: { code: "DEMO-MVP1" },
    update: {
      name: "DEMO MVP 1 Project",
      category: "MIXED",
      clientId: demoClient.id,
      engineerId: demoEngineer.id,
      location: "Demo Location - Sohag",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      targetDate: new Date("2026-10-15T00:00:00.000Z"),
      phase: "EXECUTION",
      progress: 35,
      status: "ACTIVE",
      notes: "Clearly labeled demo project for MVP 1 verification only."
    },
    create: {
      code: "DEMO-MVP1",
      name: "DEMO MVP 1 Project",
      category: "MIXED",
      clientId: demoClient.id,
      engineerId: demoEngineer.id,
      location: "Demo Location - Sohag",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      targetDate: new Date("2026-10-15T00:00:00.000Z"),
      phase: "EXECUTION",
      progress: 35,
      status: "ACTIVE",
      notes: "Clearly labeled demo project for MVP 1 verification only."
    }
  });

  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: demoProject.id, userId: demoWorker.id } },
    update: {},
    create: { projectId: demoProject.id, userId: demoWorker.id }
  });

  const configuredStorage = process.env.STORAGE_ROOT ?? "storage";
  const apiStorageRoot = isAbsolute(configuredStorage)
    ? configuredStorage
    : resolve(__dirname, "../../../apps/api", configuredStorage);
  const demoDesignDirectory = resolve(apiStorageRoot, "projects", demoProject.id, "designs");
  const demoStoredFilename = "demo-architectural-floor-plan-rev-01.pdf";
  const demoStoragePath = `projects/${demoProject.id}/designs/${demoStoredFilename}`;
  const demoPdf = createDemoPdf("ELHABAK - Architectural Floor Plan - REV 01");
  await mkdir(demoDesignDirectory, { recursive: true });
  await writeFile(resolve(demoDesignDirectory, demoStoredFilename), demoPdf);

  let demoDesign = await prisma.designItem.findFirst({
    where: { projectId: demoProject.id, title: "Architectural Floor Plan" }
  });
  if (!demoDesign) {
    demoDesign = await prisma.designItem.create({
      data: {
        projectId: demoProject.id,
        title: "Architectural Floor Plan",
        description: "Demo architectural drawing prepared for client review.",
        discipline: "ARCHITECTURAL",
        status: "IN_REVIEW",
        currentRevisionNumber: 1
      }
    });
  } else {
    demoDesign = await prisma.designItem.update({
      where: { id: demoDesign.id },
      data: {
        description: "Demo architectural drawing prepared for client review.",
        discipline: "ARCHITECTURAL"
      }
    });
  }

  const demoRevision = await prisma.designRevision.upsert({
    where: { designId_revisionNumber: { designId: demoDesign.id, revisionNumber: 1 } },
    update: {
      storagePath: demoStoragePath,
      storedFilename: demoStoredFilename,
      originalFilename: "architectural-floor-plan-rev-01.pdf",
      mimeType: "application/pdf",
      fileSize: demoPdf.length,
      uploaderId: demoEngineer.id
    },
    create: {
      designId: demoDesign.id,
      projectId: demoProject.id,
      revisionNumber: 1,
      status: "IN_REVIEW",
      notes: "Initial architectural floor plan for client review.",
      storagePath: demoStoragePath,
      storedFilename: demoStoredFilename,
      originalFilename: "architectural-floor-plan-rev-01.pdf",
      mimeType: "application/pdf",
      fileSize: demoPdf.length,
      uploaderId: demoEngineer.id
    }
  });

  const seedEvents = ["DESIGN_CREATED", "REVISION_UPLOADED", "SUBMITTED_FOR_REVIEW"] as const;
  for (const action of seedEvents) {
    const existingEvent = await prisma.designEvent.findFirst({
      where: { designId: demoDesign.id, revisionId: demoRevision.id, action }
    });
    if (!existingEvent) {
      await prisma.designEvent.create({ data: { designId: demoDesign.id, revisionId: demoRevision.id, actorId: demoEngineer.id, action } });
    }
  }

  const count = await prisma.user.count({
    where: { email: { endsWith: "@elhabak.local" } }
  });

  console.log(`Seed complete. Demo users present: ${count}. DEMO-MVP1 and Design Hub sample ready.`);
}

function createDemoPdf(title: string) {
  const escaped = title.replace(/[()\\]/g, (character) => `\\${character}`);
  const stream = `BT /F1 24 Tf 72 500 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  let content = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(content, "ascii"));
    content += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(content, "ascii");
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  content += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(content, "ascii");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  });
