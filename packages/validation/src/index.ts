import { z } from "zod";
import { moneyAmountSchema, quantitySchema } from "./money";

export * from "./money";

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

export const siteUpdateTypeSchema = z.enum([
  "PROGRESS",
  "INSPECTION",
  "ISSUE",
  "MATERIAL",
  "GENERAL"
]);

const booleanFormValueSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "1",
  z.boolean()
);

const booleanWithDefaultTrueSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return true;
    if (value === "false" || value === false || value === "0") return false;
    return true;
  },
  z.boolean()
);

export const createSiteUpdateSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  type: siteUpdateTypeSchema.default("GENERAL"),
  progressImpact: z.coerce.number().int().min(0).max(100).optional(),
  isClientVisible: booleanWithDefaultTrueSchema.default(true)
});

export const updateProjectProgressSchema = z.object({
  progress: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().max(1000).optional().or(z.literal(""))
});

export const updateProjectPhaseSchema = z.object({
  phase: projectPhaseSchema,
  note: z.string().trim().max(1000).optional().or(z.literal(""))
});


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

export const boqUnitSchema = z.enum(["M", "M2", "M3", "ITEM", "LOT"]);
export const expenseCategorySchema = z.enum([
  "MATERIAL",
  "LABOR",
  "TRANSPORT",
  "EQUIPMENT",
  "SUBCONTRACTOR",
  "OTHER"
]);
export const paymentMethodSchema = z.enum(["CASH", "BANK_TRANSFER", "CHECK", "OTHER"]);

const optionalNoteSchema = z.string().trim().max(1000).optional().or(z.literal(""));

export const setContractValueSchema = z.object({
  amount: moneyAmountSchema,
  note: optionalNoteSchema
});

export const createEstimateSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().trim().max(3000).optional().or(z.literal(""))
});

export const updateEstimateSchema = z
  .object({
    title: nonEmptyStringSchema.optional(),
    description: z.string().trim().max(3000).optional().or(z.literal(""))
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const costLineItemSchema = z.object({
  description: nonEmptyStringSchema,
  unit: boqUnitSchema,
  quantity: quantitySchema,
  unitRate: moneyAmountSchema,
  note: optionalNoteSchema,
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0)
});

export const updateCostLineItemSchema = z
  .object({
    description: nonEmptyStringSchema.optional(),
    unit: boqUnitSchema.optional(),
    quantity: quantitySchema.optional(),
    unitRate: moneyAmountSchema.optional(),
    note: optionalNoteSchema,
    sortOrder: z.coerce.number().int().min(0).max(100000).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const boqItemSchema = costLineItemSchema.extend({
  code: z.string().trim().min(1).max(40),
  section: z.string().trim().max(120).optional().or(z.literal(""))
});

export const updateBoqItemSchema = z
  .object({
    code: z.string().trim().min(1).max(40).optional(),
    section: z.string().trim().max(120).optional().or(z.literal("")),
    description: nonEmptyStringSchema.optional(),
    unit: boqUnitSchema.optional(),
    quantity: quantitySchema.optional(),
    unitRate: moneyAmountSchema.optional(),
    note: optionalNoteSchema,
    sortOrder: z.coerce.number().int().min(0).max(100000).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const expenseSchema = z.object({
  category: expenseCategorySchema,
  description: nonEmptyStringSchema,
  amount: moneyAmountSchema,
  expenseDate: z.string().trim().date(),
  vendor: z.string().trim().max(255).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  note: optionalNoteSchema
});

export const updateExpenseSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    description: nonEmptyStringSchema.optional(),
    amount: moneyAmountSchema.optional(),
    expenseDate: z.string().trim().date().optional(),
    vendor: z.string().trim().max(255).optional().or(z.literal("")),
    reference: z.string().trim().max(120).optional().or(z.literal("")),
    note: optionalNoteSchema
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const clientPaymentSchema = z.object({
  amount: moneyAmountSchema,
  paymentDate: z.string().trim().date(),
  method: paymentMethodSchema,
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  description: optionalNoteSchema
});

export const updateClientPaymentSchema = z
  .object({
    amount: moneyAmountSchema.optional(),
    paymentDate: z.string().trim().date().optional(),
    method: paymentMethodSchema.optional(),
    reference: z.string().trim().max(120).optional().or(z.literal("")),
    description: optionalNoteSchema
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const contractorPaymentSchema = z.object({
  payee: nonEmptyStringSchema,
  amount: moneyAmountSchema,
  paymentDate: z.string().trim().date(),
  method: paymentMethodSchema,
  category: expenseCategorySchema.optional(),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  description: optionalNoteSchema
});

export const updateContractorPaymentSchema = z
  .object({
    payee: nonEmptyStringSchema.optional(),
    amount: moneyAmountSchema.optional(),
    paymentDate: z.string().trim().date().optional(),
    method: paymentMethodSchema.optional(),
    category: expenseCategorySchema.optional(),
    reference: z.string().trim().max(120).optional().or(z.literal("")),
    description: optionalNoteSchema
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const voidRecordSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const documentCategorySchema = z.enum(["CONTRACT", "PERMIT", "REPORT", "CORRESPONDENCE", "HANDOVER", "OTHER"]);
export const documentStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);

const clientVisibleFormSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "1",
  z.boolean()
);

export const createDocumentSchema = z.object({
  reference: z.string().trim().min(1).max(60),
  title: nonEmptyStringSchema,
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  category: documentCategorySchema,
  isClientVisible: clientVisibleFormSchema.default(false),
  versionNote: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const updateDocumentMetadataSchema = z
  .object({
    reference: z.string().trim().min(1).max(60).optional(),
    title: nonEmptyStringSchema.optional(),
    description: z.string().trim().max(3000).optional().or(z.literal("")),
    category: documentCategorySchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const addDocumentVersionSchema = z.object({
  note: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const setDocumentVisibilitySchema = z.object({
  isClientVisible: clientVisibleFormSchema
});

export const chatMessageTypeSchema = z.enum(["TEXT", "VOICE"]);

export const createChatMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TEXT"),
    text: z.string().trim().min(1).max(2000)
  }),
  z.object({
    type: z.literal("VOICE"),
    durationSeconds: z.coerce.number().int().min(1).max(180)
  })
]);

export type CreateChatMessageInput = z.infer<typeof createChatMessageSchema>;

export type SetContractValueInput = z.infer<typeof setContractValueSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
export type CostLineItemInput = z.infer<typeof costLineItemSchema>;
export type UpdateCostLineItemInput = z.infer<typeof updateCostLineItemSchema>;
export type BoqItemInput = z.infer<typeof boqItemSchema>;
export type UpdateBoqItemInput = z.infer<typeof updateBoqItemSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ClientPaymentInput = z.infer<typeof clientPaymentSchema>;
export type UpdateClientPaymentInput = z.infer<typeof updateClientPaymentSchema>;
export type ContractorPaymentInput = z.infer<typeof contractorPaymentSchema>;
export type UpdateContractorPaymentInput = z.infer<typeof updateContractorPaymentSchema>;
export type VoidRecordInput = z.infer<typeof voidRecordSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentMetadataInput = z.infer<typeof updateDocumentMetadataSchema>;
export type AddDocumentVersionInput = z.infer<typeof addDocumentVersionSchema>;
export type SetDocumentVisibilityInput = z.infer<typeof setDocumentVisibilitySchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateSiteUpdateInput = z.infer<typeof createSiteUpdateSchema>;
export type SiteUpdateType = z.infer<typeof siteUpdateTypeSchema>;
export type UpdateProjectProgressInput = z.infer<typeof updateProjectProgressSchema>;
export type UpdateProjectPhaseInput = z.infer<typeof updateProjectPhaseSchema>;
export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
export type CreateDesignRevisionInput = z.infer<typeof createDesignRevisionSchema>;
export type DesignDecisionInput = z.infer<typeof designDecisionSchema>;
export type DesignCommentInput = z.infer<typeof designCommentSchema>;

