import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string().min(1),
  timestamp: z.string().datetime(),
  database: z.enum(["connected", "unavailable"])
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const emailSchema = z.string().trim().email().max(254);

export const nonEmptyStringSchema = z.string().trim().min(1).max(255);
