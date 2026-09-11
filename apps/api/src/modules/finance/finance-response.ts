import type { Prisma } from "@elhabak/database";
import { formatMoneyMajor, formatQuantityMajor } from "@elhabak/validation";
import { toRequestUser } from "../auth/auth.service";

const actorSelect = { id: true, email: true, displayName: true, role: true, isActive: true } satisfies Prisma.UserSelect;

export const boqItemInclude = { createdBy: { select: actorSelect } } satisfies Prisma.BOQItemInclude;
export type BOQItemWithRelations = Prisma.BOQItemGetPayload<{ include: typeof boqItemInclude }>;

export function toBoqItemResponse(item: BOQItemWithRelations) {
  return {
    id: item.id,
    code: item.code,
    section: item.section,
    description: item.description,
    unit: item.unit,
    quantity: formatQuantityMajor(item.quantityMilli),
    unitRate: formatMoneyMajor(item.unitRateMinor),
    lineTotal: formatMoneyMajor(item.lineTotalMinor),
    note: item.note,
    sortOrder: item.sortOrder,
    createdBy: toRequestUser(item.createdBy),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export const estimateItemInclude = {} satisfies Prisma.CostEstimateItemInclude;
export type CostEstimateItemRecord = Prisma.CostEstimateItemGetPayload<{ include: typeof estimateItemInclude }>;

export function toEstimateItemResponse(item: CostEstimateItemRecord) {
  return {
    id: item.id,
    description: item.description,
    unit: item.unit,
    quantity: formatQuantityMajor(item.quantityMilli),
    unitRate: formatMoneyMajor(item.unitRateMinor),
    lineTotal: formatMoneyMajor(item.lineTotalMinor),
    note: item.note,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export const estimateInclude = {
  createdBy: { select: actorSelect },
  items: { orderBy: { sortOrder: "asc" } }
} satisfies Prisma.CostEstimateInclude;
export type CostEstimateWithRelations = Prisma.CostEstimateGetPayload<{ include: typeof estimateInclude }>;

export function toEstimateResponse(estimate: CostEstimateWithRelations) {
  const items = estimate.items.map(toEstimateItemResponse);
  const totalMinor = estimate.items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  return {
    id: estimate.id,
    title: estimate.title,
    version: estimate.version,
    isCurrent: estimate.isCurrent,
    description: estimate.description,
    items,
    total: formatMoneyMajor(totalMinor),
    createdBy: toRequestUser(estimate.createdBy),
    createdAt: estimate.createdAt.toISOString(),
    updatedAt: estimate.updatedAt.toISOString()
  };
}

export const attachmentInclude = { uploadedBy: { select: actorSelect } } satisfies Prisma.FinancialAttachmentInclude;
export type FinancialAttachmentWithRelations = Prisma.FinancialAttachmentGetPayload<{ include: typeof attachmentInclude }>;

export function toAttachmentResponse(attachment: FinancialAttachmentWithRelations) {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    uploadedBy: toRequestUser(attachment.uploadedBy),
    createdAt: attachment.createdAt.toISOString()
  };
}

export const expenseInclude = { createdBy: { select: actorSelect }, attachments: { include: attachmentInclude } } satisfies Prisma.ExpenseInclude;
export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export function toExpenseResponse(expense: ExpenseWithRelations) {
  return {
    id: expense.id,
    category: expense.category,
    description: expense.description,
    amount: formatMoneyMajor(expense.amountMinor),
    currency: expense.currency,
    expenseDate: expense.expenseDate.toISOString(),
    vendor: expense.vendor,
    reference: expense.reference,
    note: expense.note,
    status: expense.status,
    voidReason: expense.voidReason,
    attachments: expense.attachments.map(toAttachmentResponse),
    createdBy: toRequestUser(expense.createdBy),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}

export const clientPaymentInclude = { createdBy: { select: actorSelect }, attachments: { include: attachmentInclude } } satisfies Prisma.ClientPaymentInclude;
export type ClientPaymentWithRelations = Prisma.ClientPaymentGetPayload<{ include: typeof clientPaymentInclude }>;

export function toClientPaymentResponse(payment: ClientPaymentWithRelations) {
  return {
    id: payment.id,
    amount: formatMoneyMajor(payment.amountMinor),
    currency: payment.currency,
    paymentDate: payment.paymentDate.toISOString(),
    method: payment.method,
    reference: payment.reference,
    description: payment.description,
    status: payment.status,
    voidReason: payment.voidReason,
    attachments: payment.attachments.map(toAttachmentResponse),
    createdBy: toRequestUser(payment.createdBy),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString()
  };
}

/** The subset of a client payment that is ever safe to show to the owning Client. */
export function toClientSafePaymentResponse(payment: ClientPaymentWithRelations) {
  return {
    id: payment.id,
    amount: formatMoneyMajor(payment.amountMinor),
    currency: payment.currency,
    paymentDate: payment.paymentDate.toISOString(),
    method: payment.method,
    reference: payment.reference,
    description: payment.description,
    status: payment.status,
    attachments: payment.attachments.map(toAttachmentResponse)
  };
}

export const contractorPaymentInclude = { createdBy: { select: actorSelect }, attachments: { include: attachmentInclude } } satisfies Prisma.ContractorPaymentInclude;
export type ContractorPaymentWithRelations = Prisma.ContractorPaymentGetPayload<{ include: typeof contractorPaymentInclude }>;

export function toContractorPaymentResponse(payment: ContractorPaymentWithRelations) {
  return {
    id: payment.id,
    payee: payment.payee,
    amount: formatMoneyMajor(payment.amountMinor),
    currency: payment.currency,
    paymentDate: payment.paymentDate.toISOString(),
    method: payment.method,
    category: payment.category,
    reference: payment.reference,
    description: payment.description,
    status: payment.status,
    voidReason: payment.voidReason,
    attachments: payment.attachments.map(toAttachmentResponse),
    createdBy: toRequestUser(payment.createdBy),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString()
  };
}
