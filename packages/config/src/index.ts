import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DIRECT_DATABASE_URL: z.string().url().startsWith("postgresql://").optional(),
  WEB_ORIGIN: z
    .string()
    .url()
    .transform((val) => val.replace(/\/+$/, ""))
    .default("http://localhost:3000"),
  // Comma-separated additional trusted web origins (e.g. a staging frontend or a future
  // custom domain kept alongside the Railway one). Used by CORS, the realtime gateway, and
  // the Origin/Referer CSRF check.
  EXTRA_WEB_ORIGINS: z
    .string()
    .trim()
    .optional()
    .transform((val) =>
      (val ?? "")
        .split(",")
        .map((item) => item.trim().replace(/\/+$/, ""))
        .filter((item) => /^https?:\/\//.test(item))
    ),
  AUTH_SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("elhabak_session"),
  SESSION_EXPIRES_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  // Login brute-force ceiling: attempts per 60s window per real client IP. Test harnesses
  // raise this via env so repeated suite logins never flake; production leaves the default.
  AUTH_LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(8),
  STORAGE_ROOT: z.string().trim().min(1).default("storage"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(100).default(25),
  ALLOWED_UPLOAD_MIME_TYPES: z.string().trim().min(1).default("image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf")
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(env);
}

export const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().optional()
});

export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;

export function parseWebPublicEnv(env: NodeJS.ProcessEnv): WebPublicEnv {
  return webPublicEnvSchema.parse(env);
}
