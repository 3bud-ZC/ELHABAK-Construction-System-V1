#!/usr/bin/env node
/**
 * ELHABAK file-store backup.
 *
 * Archives STORAGE_ROOT (the Railway volume mounted at /app/storage in production) into a
 * timestamped sibling directory with a SHA-256 integrity manifest. Reads only filesystem
 * configuration from the environment - no secrets are required or printed.
 *
 * Usage (on the API host or anywhere the volume is mounted):
 *   STORAGE_ROOT=/app/storage node scripts/backup-storage.mjs
 *   STORAGE_BACKUP_DIR=/path/to/backups node scripts/backup-storage.mjs
 *
 * Restore:
 *   1. Stop the API (or run during a maintenance window) so no upload lands mid-restore.
 *   2. Copy the contents of the chosen backup directory back over STORAGE_ROOT, e.g.
 *      `cp -a <backupDir>/. $STORAGE_ROOT/`
 *   3. Optionally verify integrity first:
 *      `node scripts/backup-storage.mjs --verify <backupDir>`  (re-hashes every file
 *      against manifest.json and reports mismatches/missing files)
 *   4. Restart the API. Database and file backups should be taken from the same window;
 *      the database is the index into these paths, so restoring files without a matching
 *      database state can leave orphaned files (harmless) or missing files (media 404s).
 *
 * Never commit generated backups - they are production data.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storageRoot = resolve(process.env.STORAGE_ROOT ?? join(scriptDir, "..", "storage"));
const backupBase = resolve(
  process.env.STORAGE_BACKUP_DIR ?? join(storageRoot, "..", "storage-backups")
);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function sha256File(path) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolvePromise(hash.digest("hex")))
      .on("error", reject);
  });
}

async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(backupBase, `storage-${stamp}`);
  const manifest = { createdAt: stamp, storageRoot, files: [] };

  let count = 0;
  let totalBytes = 0;
  for await (const file of walk(storageRoot)) {
    const rel = relative(storageRoot, file).split(sep).join("/");
    const dest = join(target, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(file, dest);
    const { size } = await stat(file);
    manifest.files.push({ path: rel, size, sha256: await sha256File(file) });
    count += 1;
    totalBytes += size;
  }

  await writeFile(join(target, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Backup complete: ${count} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MiB`);
  console.log(`Location: ${target}`);
  console.log(`Verify with: node scripts/backup-storage.mjs --verify "${target}"`);
}

async function verify(dir) {
  const target = resolve(dir);
  const manifest = JSON.parse(
    await (await import("node:fs/promises")).readFile(join(target, "manifest.json"), "utf8")
  );
  let ok = 0;
  let failed = 0;
  for (const entry of manifest.files) {
    const full = join(target, entry.path);
    try {
      const digest = await sha256File(full);
      const { size } = await stat(full);
      if (digest === entry.sha256 && size === entry.size) ok += 1;
      else {
        failed += 1;
        console.error(`MISMATCH ${entry.path}`);
      }
    } catch {
      failed += 1;
      console.error(`MISSING  ${entry.path}`);
    }
  }
  console.log(`Verify: ${ok} ok, ${failed} failed, ${manifest.files.length} expected`);
  process.exitCode = failed === 0 ? 0 : 1;
}

const args = process.argv.slice(2);
if (args[0] === "--verify") {
  if (!args[1]) {
    console.error("usage: backup-storage.mjs --verify <backupDir>");
    process.exit(2);
  }
  await verify(args[1]);
} else {
  await backup();
}
