import { config } from "dotenv";
import { hash } from "bcryptjs";
import { PrismaClient, type UserRole } from "@prisma/client";
import { computeLineTotalMinor, decimalToMinorUnits } from "@elhabak/validation";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

function egp(amount: string): number {
  return decimalToMinorUnits(amount, 2);
}

function units(quantity: string): number {
  return decimalToMinorUnits(quantity, 3);
}

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
  legacyEmail?: string;
  displayName: string;
  role: UserRole;
  passwordEnv: string;
  // The sole account meant to ever be an active production login (see the client-review
  // access run in STATUS.md). Every other entry here is a local-development/demo fixture:
  // re-seeding must never flip one back to active once an operator has deactivated it in
  // production, so only this flag's account has its `isActive` forced on every run.
  forceActive: boolean;
};

const demoUsers: DemoUser[] = [
  {
    email: "mohamed.elhabak@elhabak.local",
    legacyEmail: "demo.admin@elhabak.local",
    displayName: "Eng. Mohamed Elhabak",
    role: "ADMIN",
    passwordEnv: "DEMO_ADMIN_PASSWORD",
    forceActive: true
  },
  {
    email: "demo.engineer@elhabak.local",
    displayName: "Demo Engineer",
    role: "ENGINEER",
    passwordEnv: "DEMO_ENGINEER_PASSWORD",
    forceActive: false
  },
  {
    email: "demo.accountant@elhabak.local",
    displayName: "Demo Accountant",
    role: "ACCOUNTANT",
    passwordEnv: "DEMO_ACCOUNTANT_PASSWORD",
    forceActive: false
  },
  {
    email: "demo.worker@elhabak.local",
    displayName: "Demo Worker",
    role: "WORKER",
    passwordEnv: "DEMO_WORKER_PASSWORD",
    forceActive: false
  },
  {
    email: "demo.client@elhabak.local",
    displayName: "Demo Client",
    role: "CLIENT",
    passwordEnv: "DEMO_CLIENT_PASSWORD",
    forceActive: false
  }
];

async function main() {
  for (const demoUser of demoUsers) {
    const password = process.env[demoUser.passwordEnv];

    if (!password || password.length < 10) {
      throw new Error(`${demoUser.passwordEnv} must be set in local environment.`);
    }

    const passwordHash = await hash(password, 12);

    const existingByCurrentEmail = await prisma.user.findUnique({ where: { email: demoUser.email } });
    const legacyUser = !existingByCurrentEmail && demoUser.legacyEmail
      ? await prisma.user.findUnique({ where: { email: demoUser.legacyEmail } })
      : null;

    if (legacyUser) {
      // Idempotent identity migration: rename the existing canonical account in place so its
      // id (and every relation - projects, AuditLog, messages, notifications) is preserved.
      // Re-running the seed afterward finds it by the new email and falls through to the
      // upsert branch below, so this rename never re-runs and never creates a duplicate.
      await prisma.user.update({
        where: { id: legacyUser.id },
        data: {
          email: demoUser.email,
          displayName: demoUser.displayName,
          role: demoUser.role,
          isActive: demoUser.forceActive ? true : undefined,
          passwordHash
        }
      });
    } else {
      await prisma.user.upsert({
        where: { email: demoUser.email },
        update: {
          displayName: demoUser.displayName,
          role: demoUser.role,
          isActive: demoUser.forceActive ? true : undefined,
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

  const demoAccountant = await prisma.user.findUniqueOrThrow({
    where: { email: "demo.accountant@elhabak.local" }
  });

  await prisma.projectFinancialProfile.upsert({
    where: { projectId: demoProject.id },
    update: { contractValueMinor: egp("750000.00"), updatedById: demoAccountant.id },
    create: { projectId: demoProject.id, contractValueMinor: egp("750000.00"), updatedById: demoAccountant.id }
  });

  const demoBoqItems: Array<{
    code: string;
    section: string;
    description: string;
    unit: "M2" | "M3" | "ITEM";
    quantity: string;
    unitRate: string;
    sortOrder: number;
  }> = [
    { code: "BOQ-001", section: "Sitework", description: "Excavation and site preparation", unit: "M3", quantity: "180.000", unitRate: "220.00", sortOrder: 1 },
    { code: "BOQ-002", section: "Structure", description: "Reinforced concrete foundation works", unit: "M3", quantity: "95.500", unitRate: "1850.00", sortOrder: 2 },
    { code: "BOQ-003", section: "Structure", description: "Block masonry walls", unit: "M2", quantity: "340.000", unitRate: "310.00", sortOrder: 3 },
    { code: "BOQ-004", section: "Finishing", description: "Ceramic floor tiling", unit: "M2", quantity: "210.000", unitRate: "285.00", sortOrder: 4 },
    { code: "BOQ-005", section: "MEP", description: "Electrical rough-in and distribution board", unit: "ITEM", quantity: "1.000", unitRate: "65000.00", sortOrder: 5 }
  ];

  for (const boqItem of demoBoqItems) {
    const existing = await prisma.bOQItem.findFirst({ where: { projectId: demoProject.id, code: boqItem.code } });
    const quantityMilli = units(boqItem.quantity);
    const unitRateMinor = egp(boqItem.unitRate);
    const lineTotalMinor = computeLineTotalMinor(quantityMilli, unitRateMinor);
    if (!existing) {
      await prisma.bOQItem.create({
        data: {
          projectId: demoProject.id,
          code: boqItem.code,
          section: boqItem.section,
          description: boqItem.description,
          unit: boqItem.unit,
          quantityMilli,
          unitRateMinor,
          lineTotalMinor,
          sortOrder: boqItem.sortOrder,
          createdById: demoAccountant.id
        }
      });
    }
  }

  const demoClientPayments = [
    { reference: "RCPT-DEMO-001", amount: "225000.00", paymentDate: new Date("2026-09-02T00:00:00.000Z"), method: "BANK_TRANSFER" as const, description: "First installment - 30% on MVP acceptance" },
    { reference: "RCPT-DEMO-002", amount: "150000.00", paymentDate: new Date("2026-09-20T00:00:00.000Z"), method: "CHECK" as const, description: "Second installment - execution milestone" }
  ];

  for (const payment of demoClientPayments) {
    const existing = await prisma.clientPayment.findFirst({ where: { projectId: demoProject.id, reference: payment.reference } });
    if (!existing) {
      await prisma.clientPayment.create({
        data: {
          projectId: demoProject.id,
          amountMinor: egp(payment.amount),
          paymentDate: payment.paymentDate,
          method: payment.method,
          reference: payment.reference,
          description: payment.description,
          createdById: demoAccountant.id
        }
      });
    }
  }

  const demoExpenses = [
    { reference: "EXP-DEMO-001", category: "MATERIAL" as const, description: "Cement and steel rebar delivery", amount: "48500.00", expenseDate: new Date("2026-09-05T00:00:00.000Z"), vendor: "Sohag Building Materials Co." },
    { reference: "EXP-DEMO-002", category: "LABOR" as const, description: "Foundation crew wages - week 1", amount: "21000.00", expenseDate: new Date("2026-09-08T00:00:00.000Z"), vendor: "Site labor team" }
  ];

  for (const expense of demoExpenses) {
    const existing = await prisma.expense.findFirst({ where: { projectId: demoProject.id, reference: expense.reference } });
    if (!existing) {
      await prisma.expense.create({
        data: {
          projectId: demoProject.id,
          category: expense.category,
          description: expense.description,
          amountMinor: egp(expense.amount),
          expenseDate: expense.expenseDate,
          vendor: expense.vendor,
          reference: expense.reference,
          createdById: demoAccountant.id
        }
      });
    }
  }

  const demoContractorPaymentReference = "PAY-DEMO-001";
  const existingContractorPayment = await prisma.contractorPayment.findFirst({
    where: { projectId: demoProject.id, reference: demoContractorPaymentReference }
  });
  if (!existingContractorPayment) {
    await prisma.contractorPayment.create({
      data: {
        projectId: demoProject.id,
        payee: "El-Nour Masonry Subcontractor",
        amountMinor: egp("35000.00"),
        paymentDate: new Date("2026-09-09T00:00:00.000Z"),
        method: "CASH",
        category: "SUBCONTRACTOR",
        reference: demoContractorPaymentReference,
        description: "Block masonry works - partial payment",
        createdById: demoAccountant.id
      }
    });
  }

  const demoDocuments: Array<{
    reference: string;
    title: string;
    description: string;
    category: "REPORT" | "CORRESPONDENCE";
    isClientVisible: boolean;
    storedFilename: string;
    originalFilename: string;
    pdfTitle: string;
  }> = [
    {
      reference: "DOC-001",
      title: "DEMO Site Inspection Report",
      description: "Demo site inspection summary shared with the client.",
      category: "REPORT",
      isClientVisible: true,
      storedFilename: "demo-site-inspection-report-v1.pdf",
      originalFilename: "site-inspection-report-v01.pdf",
      pdfTitle: "ELHABAK - DEMO Site Inspection Report - V01"
    },
    {
      reference: "DOC-002",
      title: "DEMO Internal Coordination Memo",
      description: "Demo internal coordination note - not shared with the client.",
      category: "CORRESPONDENCE",
      isClientVisible: false,
      storedFilename: "demo-internal-coordination-memo-v1.pdf",
      originalFilename: "internal-coordination-memo-v01.pdf",
      pdfTitle: "ELHABAK - DEMO Internal Coordination Memo - V01"
    }
  ];

  for (const demoDocument of demoDocuments) {
    let document = await prisma.projectDocument.findFirst({
      where: { projectId: demoProject.id, reference: demoDocument.reference }
    });

    const demoDocumentPdf = createDemoPdf(demoDocument.pdfTitle);

    if (!document) {
      document = await prisma.projectDocument.create({
        data: {
          projectId: demoProject.id,
          reference: demoDocument.reference,
          title: demoDocument.title,
          description: demoDocument.description,
          category: demoDocument.category,
          isClientVisible: demoDocument.isClientVisible,
          currentVersionNumber: 1,
          createdById: demoEngineer.id
        }
      });
    } else {
      document = await prisma.projectDocument.update({
        where: { id: document.id },
        data: {
          title: demoDocument.title,
          description: demoDocument.description,
          category: demoDocument.category,
          isClientVisible: demoDocument.isClientVisible
        }
      });
    }

    const demoDocumentDirectory = resolve(apiStorageRoot, "projects", demoProject.id, "documents", document.id, "v1");
    await mkdir(demoDocumentDirectory, { recursive: true });
    await writeFile(resolve(demoDocumentDirectory, demoDocument.storedFilename), demoDocumentPdf);
    const demoDocumentStoragePath = `projects/${demoProject.id}/documents/${document.id}/v1/${demoDocument.storedFilename}`;

    await prisma.projectDocumentVersion.upsert({
      where: { documentId_versionNumber: { documentId: document.id, versionNumber: 1 } },
      update: {
        storagePath: demoDocumentStoragePath,
        storedFilename: demoDocument.storedFilename,
        originalFilename: demoDocument.originalFilename,
        mimeType: "application/pdf",
        extension: ".pdf",
        fileSize: demoDocumentPdf.length,
        checksumSha256: createHash("sha256").update(demoDocumentPdf).digest("hex"),
        uploadedById: demoEngineer.id
      },
      create: {
        documentId: document.id,
        projectId: demoProject.id,
        versionNumber: 1,
        storagePath: demoDocumentStoragePath,
        storedFilename: demoDocument.storedFilename,
        originalFilename: demoDocument.originalFilename,
        mimeType: "application/pdf",
        extension: ".pdf",
        fileSize: demoDocumentPdf.length,
        checksumSha256: createHash("sha256").update(demoDocumentPdf).digest("hex"),
        note: "Initial demo version.",
        uploadedById: demoEngineer.id
      }
    });
  }

  const demoAdmin = await prisma.user.findUniqueOrThrow({
    where: { email: "mohamed.elhabak@elhabak.local" }
  });

  const demoMessages: Array<{ authorId: string; text: string }> = [
    { authorId: demoEngineer.id, text: "Good morning - foundation works for the demo project are progressing on schedule this week." },
    { authorId: demoClient.userId, text: "Thank you for the update. Could you share a few site photos when you have a chance?" },
    { authorId: demoEngineer.id, text: "Sure - I posted a new site update with photos on the Site Activity tab just now." },
    { authorId: demoAdmin.id, text: "Reviewed the progress - everything looks aligned with the execution schedule." }
  ];

  for (const demoMessage of demoMessages) {
    const existing = await prisma.projectMessage.findFirst({
      where: { projectId: demoProject.id, authorId: demoMessage.authorId, text: demoMessage.text }
    });
    if (!existing) {
      await prisma.projectMessage.create({
        data: { projectId: demoProject.id, authorId: demoMessage.authorId, type: "TEXT", text: demoMessage.text }
      });
    }
  }

  // Every demo participant is caught up with the seeded chat - the demo should not open
  // with an artificial unread badge for accounts that only just logged in.
  for (const participantId of [demoAdmin.id, demoEngineer.id, demoWorker.id, demoClient.userId]) {
    await prisma.projectChatReadState.upsert({
      where: { projectId_userId: { projectId: demoProject.id, userId: participantId } },
      update: { lastReadAt: new Date() },
      create: { projectId: demoProject.id, userId: participantId, lastReadAt: new Date() }
    });
  }

  const count = await prisma.user.count({
    where: { email: { endsWith: "@elhabak.local" } }
  });

  console.log(`Seed complete. Demo users present: ${count}. DEMO-MVP1, Design Hub, Finance, Documents, and Chat samples ready.`);
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
