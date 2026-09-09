import { config } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaClient, type UserRole } from "@prisma/client";

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

  const count = await prisma.user.count({
    where: { email: { endsWith: "@elhabak.local" } }
  });

  console.log(`Seed complete. Demo users present: ${count}.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  });
