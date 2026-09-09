import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DIRECT_DATABASE_URL: z.string().url().startsWith("postgresql://").optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  AUTH_SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("elhabak_session"),
  SESSION_EXPIRES_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  STORAGE_ROOT: z.string().trim().min(1).default("storage"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(100).default(25),
  ALLOWED_UPLOAD_MIME_TYPES: z.string().trim().min(1).default("image/jpeg,image/png,image/webp,video/mp4,video/webm")
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(env);
}

export const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000")
});

export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;

export function parseWebPublicEnv(env: NodeJS.ProcessEnv): WebPublicEnv {
  return webPublicEnvSchema.parse(env);
}
