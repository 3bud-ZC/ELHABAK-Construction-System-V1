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
export const projectCategorySchema = z.enum([
  "DESIGN",
  "CONSTRUCTION",
  "FINISHING",
  "GENERAL_CONTRACTING",
  "FURNITURE",
  "MIXED"
]);
export const projectPhaseSchema = z.enum([
  "SITE_INSPECTION",
  "DESIGN",
  "PRELIMINARY_ESTIMATION",
  "EXECUTION",
  "INITIAL_HANDOVER",
  "FINAL_HANDOVER"
]);
export const projectStatusSchema = z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);
export const designDisciplineSchema = z.enum([
  "ARCHITECTURAL",
  "STRUCTURAL",
  "INTERIOR",
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "RENDERS",
  "OTHER"
]);
export const designStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"]);

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

const optionalDateSchema = z.string().trim().date().optional().or(z.literal(""));

export const createProjectSchema = z.object({
  name: nonEmptyStringSchema,
  code: z.string().trim().min(2).max(64),
  category: projectCategorySchema,
  clientId: z.string().trim().min(1),
  engineerId: z.string().trim().min(1),
  workerIds: z.array(z.string().trim().min(1)).default([]),
  location: z.string().trim().max(500).optional().or(z.literal("")),
  startDate: optionalDateSchema,
  targetDate: optionalDateSchema,
  phase: projectPhaseSchema.default("SITE_INSPECTION"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  status: projectStatusSchema.default("PLANNED"),
  notes: z.string().trim().max(3000).optional().or(z.literal(""))
});

export const updateProjectSchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    code: z.string().trim().min(2).max(64).optional(),
    category: projectCategorySchema.optional(),
    clientId: z.string().trim().min(1).optional(),
    engineerId: z.string().trim().min(1).optional(),
    workerIds: z.array(z.string().trim().min(1)).optional(),
    location: z.string().trim().max(500).optional().or(z.literal("")),
    startDate: optionalDateSchema,
    targetDate: optionalDateSchema,
    phase: projectPhaseSchema.optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    status: projectStatusSchema.optional(),
    notes: z.string().trim().max(3000).optional().or(z.literal(""))
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const createSiteUpdateSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal(""))
});

const booleanFormValueSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "1",
  z.boolean()
);

export const createDesignSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  discipline: designDisciplineSchema,
  revisionNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  submitForReview: booleanFormValueSchema.default(false)
});

export const updateDesignSchema = z
  .object({
    title: nonEmptyStringSchema.optional(),
    description: z.string().trim().max(3000).optional().or(z.literal("")),
    discipline: designDisciplineSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const createDesignRevisionSchema = z.object({
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  submitForReview: booleanFormValueSchema.default(false)
});

export const designDecisionSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
    comment: z.string().trim().max(2000).optional().or(z.literal(""))
  })
  .refine((value) => value.action !== "REJECT" || Boolean(value.comment?.trim()), {
    message: "A rejection comment is required.",
    path: ["comment"]
  });

export const designCommentSchema = z.object({
  revisionId: z.string().trim().min(1).optional(),
  comment: z.string().trim().min(1).max(2000)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateSiteUpdateInput = z.infer<typeof createSiteUpdateSchema>;
export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
export type CreateDesignRevisionInput = z.infer<typeof createDesignRevisionSchema>;
export type DesignDecisionInput = z.infer<typeof designDecisionSchema>;
export type DesignCommentInput = z.infer<typeof designCommentSchema>;
