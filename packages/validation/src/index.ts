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

export const userRoleSchema = z.enum(["ADMIN", "ENGINEER", "ACCOUNTANT", "WORKER", "CLIENT"]);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256)
});

export const userPublicSchema = z.object({
  id: z.string(),
  email: emailSchema,
  displayName: nonEmptyStringSchema,
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createUserSchema = z.object({
  email: emailSchema,
  displayName: nonEmptyStringSchema,
  role: userRoleSchema,
  isActive: z.boolean().default(true),
  temporaryPassword: z.string().min(10).max(128)
});

export const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    displayName: nonEmptyStringSchema.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    temporaryPassword: z.string().min(10).max(128).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const createClientSchema = z.object({
  email: emailSchema,
  displayName: nonEmptyStringSchema,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  temporaryPassword: z.string().min(10).max(128)
});

export const updateClientSchema = z
  .object({
    email: emailSchema.optional(),
    displayName: nonEmptyStringSchema.optional(),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    isActive: z.boolean().optional(),
    temporaryPassword: z.string().min(10).max(128).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
