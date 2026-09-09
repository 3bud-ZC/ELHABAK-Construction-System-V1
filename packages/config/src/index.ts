import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000")
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
