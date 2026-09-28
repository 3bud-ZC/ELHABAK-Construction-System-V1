/**
 * Minimal in-process counting semaphore with a bounded wait queue. Used to cap expensive
 * work (headless-Chromium PDF rendering) so a burst of requests queues instead of
 * spawning unbounded renderer processes. Callers that cannot get a slot within
 * `waitMs`, or arrive when the queue is full, are rejected so they can answer 503.
 */
export class Semaphore {
  private active = 0;
  private readonly waiters: Array<{ resolve: () => void; timer: NodeJS.Timeout }> = [];

  constructor(
    private readonly max: number,
    private readonly maxQueue: number,
    private readonly waitMs: number
  ) {}

  get inUse() {
    return this.active;
  }

  get queued() {
    return this.waiters.length;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve();
    }
    if (this.waiters.length >= this.maxQueue) {
      return Promise.reject(new SemaphoreBusyError());
    }
    return new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve: () => {
          clearTimeout(waiter.timer);
          resolve();
        },
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new SemaphoreBusyError());
        }, this.waitMs)
      };
      this.waiters.push(waiter);
    });
  }

  private release() {
    const next = this.waiters.shift();
    if (next) {
      // Hand the slot straight to the next waiter; `active` stays the same.
      next.resolve();
      return;
    }
    this.active = Math.max(0, this.active - 1);
  }
}

export class SemaphoreBusyError extends Error {
  constructor() {
    super("Capacity exhausted.");
  }
}
