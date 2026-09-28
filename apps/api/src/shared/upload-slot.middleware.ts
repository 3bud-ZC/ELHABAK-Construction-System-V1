import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { Semaphore, SemaphoreBusyError } from "./semaphore";

/**
 * Uploads are parsed into memory by Multer (magic-byte validation reads the buffer), so
 * every in-flight multipart body costs up to Nginx's 30 MB body cap in API RAM. Without
 * a bound, a burst of simultaneous uploads could push the single API process past its
 * PM2 memory ceiling. This caps concurrently *parsed* multipart requests
 * (UPLOAD_CONCURRENCY, default 6 => at most ~180 MB of upload buffers); further uploads
 * wait (their bodies stay in socket buffers) and get 503 after 60 s or when UPLOAD_QUEUE
 * (default 50) are already waiting. Non-multipart requests are untouched.
 */
@Injectable()
export class UploadSlotMiddleware implements NestMiddleware {
  private static readonly slots = new Semaphore(
    positiveInt(process.env.UPLOAD_CONCURRENCY, 6),
    positiveInt(process.env.UPLOAD_QUEUE, 50),
    60_000
  );

  static get load() {
    return { active: UploadSlotMiddleware.slots.inUse, queued: UploadSlotMiddleware.slots.queued };
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("multipart/form-data")) {
      next();
      return;
    }
    UploadSlotMiddleware.slots
      .run(
        () =>
          new Promise<void>((release) => {
            // The slot is held until the response is done or the client goes away.
            res.once("finish", () => release());
            res.once("close", () => release());
            next();
          })
      )
      .catch((error: unknown) => {
        if (error instanceof SemaphoreBusyError && !res.headersSent) {
          res.status(503).json({ statusCode: 503, error: "Service Unavailable", message: "Upload capacity is busy. Try again shortly." });
          return;
        }
        next(error);
      });
  }
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
