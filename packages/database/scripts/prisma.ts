import { config } from "dotenv";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error("Prisma command arguments are required.");
}

const child = spawn("prisma", args, {
  shell: true,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
