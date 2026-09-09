import { config } from "dotenv";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Client } from "pg";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database URL is required.");
}

const client = new Client({ connectionString: databaseUrl });

async function main() {
  await withRetry(() => client.connect());
  await client.query("SELECT 1");
  await ensureMigrationsTable();

  const migrationsDir = resolve(__dirname, "../prisma/migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let applied = 0;

  for (const migrationName of migrationNames) {
    const existing = await client.query<{ migration_name: string }>(
      'SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL LIMIT 1',
      [migrationName]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sqlPath = join(migrationsDir, migrationName, "migration.sql");
    const sql = await readFile(sqlPath, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
          (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [randomUUID(), checksum, basename(migrationName)]
      );
      await client.query("COMMIT");
      applied += 1;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  }

  console.log(`Repository migrations applied: ${applied}.`);
}

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 750 * (attempt + 1)));
    }
  }

  throw lastError;
}

main()
  .finally(async () => {
    await client.end().catch(() => undefined);
  })
  .catch(() => {
    console.error("Migration application failed.");
    process.exitCode = 1;
  });
