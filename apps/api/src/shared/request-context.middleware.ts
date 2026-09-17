import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Per-request correlation id: surfaced as the `x-request-id` response header and embedded
 * in error bodies by ApiExceptionFilter, so any failure in Railway logs can be tied back
 * to the exact request that produced it. `nosniff` is applied API-wide here as well.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-content-type-options", "nosniff");
    next();
  }
}
