import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

/**
 * bcrypt (cost 12, pure-JS bcryptjs) costs ~250 ms of CPU per hash/compare. On the
 * API's single event loop a morning login wave serialised every sign-in behind the
 * others and slowed every other request with it (measured: 10 parallel logins → 2.7 s
 * each). Hashing now runs on a small worker_threads pool: the event loop stays free
 * and sign-ins use the other cores in parallel. Same algorithm, cost and hashes.
 *
 * BCRYPT_WORKERS overrides the pool size (default: CPU count − 1, between 1 and 3).
 */
type Job = { id: number; op: "hash" | "compare"; a: string; b: string | number };
type Pending = { resolve: (value: string | boolean) => void; reject: (error: Error) => void };

const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
const bcrypt = require(workerData.bcryptPath);
parentPort.on("message", async (job) => {
  try {
    const value = job.op === "hash" ? await bcrypt.hash(job.a, job.b) : await bcrypt.compare(job.a, job.b);
    parentPort.postMessage({ id: job.id, value });
  } catch (error) {
    parentPort.postMessage({ id: job.id, error: String(error && error.message || error) });
  }
});
`;

class HashPool {
  private readonly workers: Array<{ worker: Worker; busy: number }> = [];
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(private readonly size: number, private readonly bcryptPath: string) {}

  run(op: Job["op"], a: string, b: string | number): Promise<string | boolean> {
    const slot = this.pickWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => {
          slot.busy -= 1;
          resolve(value);
        },
        reject: (error) => {
          slot.busy -= 1;
          reject(error);
        }
      });
      slot.busy += 1;
      slot.worker.postMessage({ id, op, a, b } satisfies Job);
    });
  }

  async close() {
    await Promise.all(this.workers.map((slot) => slot.worker.terminate()));
    this.workers.length = 0;
  }

  private pickWorker() {
    if (this.workers.length < this.size) {
      const idle = this.workers.find((slot) => slot.busy === 0);
      if (idle) return idle;
      return this.spawn();
    }
    return this.workers.reduce((least, slot) => (slot.busy < least.busy ? slot : least));
  }

  private spawn() {
    const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { bcryptPath: this.bcryptPath } });
    worker.unref();
    const slot = { worker, busy: 0 };
    worker.on("message", (message: { id: number; value?: string | boolean; error?: string }) => {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error !== undefined) pending.reject(new Error(message.error));
      else pending.resolve(message.value as string | boolean);
    });
    worker.on("error", (error: Error) => {
      // A crashed worker fails its in-flight jobs; the next call spawns a replacement.
      const index = this.workers.indexOf(slot);
      if (index >= 0) this.workers.splice(index, 1);
      for (const [id, pending] of this.pending) {
        this.pending.delete(id);
        pending.reject(error);
      }
    });
    this.workers.push(slot);
    return slot;
  }
}

const bcryptPath = createRequire(__filename).resolve("bcryptjs");
const defaultSize = Math.max(1, Math.min(3, availableParallelism() - 1));
const configured = Number(process.env.BCRYPT_WORKERS);
const pool = new HashPool(Number.isInteger(configured) && configured > 0 ? configured : defaultSize, bcryptPath);

export async function hashPassword(password: string, cost = 12): Promise<string> {
  return (await pool.run("hash", password, cost)) as string;
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  return (await pool.run("compare", password, passwordHash)) as boolean;
}

export async function closePasswordPool() {
  await pool.close();
}
