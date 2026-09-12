import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ExpenseCategory } from "@elhabak/database";
import {
  boqItemSchema,
  clientPaymentSchema,
  computeLineTotalMinor,
  contractorPaymentSchema,
  costLineItemSchema,
  createEstimateSchema,
  expenseSchema,
  formatMoneyMajor,
  setContractValueSchema,
  updateBoqItemSchema,
  updateClientPaymentSchema,
  updateContractorPaymentSchema,
  updateCostLineItemSchema,
  updateEstimateSchema,
  updateExpenseSchema,
  voidRecordSchema
} from "@elhabak/validation";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { parseBody } from "../../shared/zod";
import { toRequestUser } from "../auth/auth.service";
import { AuditService } from "../admin/audit.service";
import { StorageService } from "../projects/storage.service";
import { FinanceAccessService } from "./finance-access.service";
import {
  boqItemInclude,
  clientPaymentInclude,
  contractorPaymentInclude,
  estimateInclude,
  expenseInclude,
  toBoqItemResponse,
  toClientPaymentResponse,
  toClientSafePaymentResponse,
  toContractorPaymentResponse,
  toEstimateResponse,
  toExpenseResponse
} from "./finance-response";

const EXPENSE_CATEGORIES: ExpenseCategory[] = ["MATERIAL", "LABOR", "TRANSPORT", "EQUIPMENT", "SUBCONTRACTOR", "OTHER"];

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FinanceAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService
  ) {}

  // ---------------------------------------------------------------------------
  // Lightweight project header - available to every finance-authorized role,
  // independent of the broader project-read permissions used by Design/Site
  // Operations (Accountant has company-wide finance access but no assignment).
  // ---------------------------------------------------------------------------

  async getProjectContext(user: RequestUser, projectId: string) {
    await this.access.assertCanViewAny(user, projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: { include: { user: true } }, engineer: true }
    });
    if (!project) throw new NotFoundException("Project not found.");

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      category: project.category,
      phase: project.phase,
      status: project.status,
      progress: project.progress,
      location: project.location,
      client: project.client ? { id: project.client.id, phone: project.client.phone, user: toRequestUser(project.client.user) } : null,
      engineer: project.engineer ? toRequestUser(project.engineer) : null
    };
  }

  async listProjectsForFinance(user: RequestUser) {
    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      throw new ForbiddenException("Finance access denied.");
    }

    const projects = await this.prisma.project.findMany({
      include: { client: { include: { user: true } } },
      orderBy: { updatedAt: "desc" }
    });

    return projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      category: project.category,
      phase: project.phase,
      status: project.status,
      progress: project.progress,
      client: project.client ? { id: project.client.id, user: toRequestUser(project.client.user) } : null
    }));
  }

  // ---------------------------------------------------------------------------
  // Financial profile, contract value, and role-aware summary
  // ---------------------------------------------------------------------------

  async setContractValue(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const input = parseBody(setContractValueSchema, rawBody);
    const existing = await this.prisma.projectFinancialProfile.findUnique({ where: { projectId } });

    await this.prisma.projectFinancialProfile.upsert({
      where: { projectId },
      update: { contractValueMinor: input.amount, updatedById: user.id },
      create: { projectId, contractValueMinor: input.amount, updatedById: user.id }
    });

    await this.audit.record(
      user,
      "finance.contract_value_set",
      { from: existing?.contractValueMinor ?? null, to: input.amount, note: input.note || null },
      projectId
    );

    return this.getSummary(user, projectId);
  }

  async getSummary(user: RequestUser, projectId: string) {
    if (user.role === "CLIENT") {
      await this.access.assertCanViewClientSummary(user, projectId);
      return this.buildClientSummary(projectId);
    }
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      await this.access.assertCanManage(user, projectId);
      return this.buildFullSummary(projectId);
    }
    throw new ForbiddenException("Finance access denied.");
  }

  private async buildFullSummary(projectId: string) {
    const [profile, boqAgg, currentEstimate, clientAgg, expenseAgg, contractorAgg] = await Promise.all([
      this.prisma.projectFinancialProfile.findUnique({ where: { projectId } }),
      this.prisma.bOQItem.aggregate({ where: { projectId }, _sum: { lineTotalMinor: true } }),
      this.prisma.costEstimate.findFirst({ where: { projectId, isCurrent: true }, include: { items: true } }),
      this.prisma.clientPayment.aggregate({ where: { projectId, status: "ACTIVE" }, _sum: { amountMinor: true } }),
      this.prisma.expense.aggregate({ where: { projectId, status: "ACTIVE" }, _sum: { amountMinor: true } }),
      this.prisma.contractorPayment.aggregate({ where: { projectId, status: "ACTIVE" }, _sum: { amountMinor: true } })
    ]);

    const currency = profile?.currency ?? "EGP";
    const contractValueMinor = profile?.contractValueMinor ?? null;
    const boqTotalMinor = boqAgg._sum.lineTotalMinor ?? 0;
    const estimateTotalMinor = currentEstimate ? currentEstimate.items.reduce((sum, item) => sum + item.lineTotalMinor, 0) : 0;
    const clientPaymentsTotalMinor = clientAgg._sum.amountMinor ?? 0;
    const expensesTotalMinor = expenseAgg._sum.amountMinor ?? 0;
    const contractorPaymentsTotalMinor = contractorAgg._sum.amountMinor ?? 0;
    const committedCostTotalMinor = expensesTotalMinor + contractorPaymentsTotalMinor;
    const outstandingBalanceMinor = contractValueMinor === null ? null : contractValueMinor - clientPaymentsTotalMinor;

    return {
      currency,
      contractValue: contractValueMinor === null ? null : formatMoneyMajor(contractValueMinor),
      boqTotal: formatMoneyMajor(boqTotalMinor),
      estimateTotal: formatMoneyMajor(estimateTotalMinor),
      clientPaymentsTotal: formatMoneyMajor(clientPaymentsTotalMinor),
      outstandingBalance: outstandingBalanceMinor === null ? null : formatMoneyMajor(outstandingBalanceMinor),
      expensesTotal: formatMoneyMajor(expensesTotalMinor),
      contractorPaymentsTotal: formatMoneyMajor(contractorPaymentsTotalMinor),
      committedCostTotal: formatMoneyMajor(committedCostTotalMinor)
    };
  }

  private async buildClientSummary(projectId: string) {
    const [profile, clientAgg] = await Promise.all([
      this.prisma.projectFinancialProfile.findUnique({ where: { projectId } }),
      this.prisma.clientPayment.aggregate({ where: { projectId, status: "ACTIVE" }, _sum: { amountMinor: true } })
    ]);

    const currency = profile?.currency ?? "EGP";
    const contractValueMinor = profile?.contractValueMinor ?? null;
    const paidAmountMinor = clientAgg._sum.amountMinor ?? 0;
    const outstandingBalanceMinor = contractValueMinor === null ? null : contractValueMinor - paidAmountMinor;

    return {
      currency,
      contractValue: contractValueMinor === null ? null : formatMoneyMajor(contractValueMinor),
      paidAmount: formatMoneyMajor(paidAmountMinor),
      outstandingBalance: outstandingBalanceMinor === null ? null : formatMoneyMajor(outstandingBalanceMinor)
    };
  }

  // ---------------------------------------------------------------------------
  // Preliminary cost estimate (versioned working document)
  // ---------------------------------------------------------------------------

  async listEstimates(user: RequestUser, projectId: string) {
    await this.access.assertCanManage(user, projectId);
    const estimates = await this.prisma.costEstimate.findMany({
      where: { projectId },
      include: estimateInclude,
      orderBy: { version: "desc" }
    });
    return estimates.map(toEstimateResponse);
  }

  async createEstimate(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const existingCurrent = await this.prisma.costEstimate.findFirst({ where: { projectId, isCurrent: true } });
    if (existingCurrent) {
      throw new ConflictException("A working estimate already exists. Use the new-version action to start another.");
    }

    const input = parseBody(createEstimateSchema, rawBody);
    const estimate = await this.prisma.costEstimate.create({
      data: {
        projectId,
        title: input.title.trim(),
        description: emptyToNull(input.description),
        version: 1,
        isCurrent: true,
        createdById: user.id
      },
      include: estimateInclude
    });

    await this.audit.record(user, "finance.estimate_created", { estimateId: estimate.id, version: 1 }, projectId);
    return toEstimateResponse(estimate);
  }

  async updateEstimate(user: RequestUser, projectId: string, estimateId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const estimate = await this.findEstimate(projectId, estimateId);
    this.assertEstimateEditable(estimate);
    const input = parseBody(updateEstimateSchema, rawBody);

    await this.prisma.costEstimate.update({
      where: { id: estimateId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {})
      }
    });

    await this.audit.record(user, "finance.estimate_updated", { estimateId }, projectId);
    return this.getEstimate(user, projectId, estimateId);
  }

  async createNewEstimateVersion(user: RequestUser, projectId: string, estimateId: string) {
    await this.access.assertCanManage(user, projectId);
    const estimate = await this.findEstimate(projectId, estimateId);
    this.assertEstimateEditable(estimate);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.costEstimate.update({ where: { id: estimateId }, data: { isCurrent: false } });
      return tx.costEstimate.create({
        data: {
          projectId,
          title: estimate.title,
          version: estimate.version + 1,
          isCurrent: true,
          createdById: user.id
        },
        include: estimateInclude
      });
    });

    await this.audit.record(
      user,
      "finance.estimate_versioned",
      { previousEstimateId: estimateId, newEstimateId: created.id, version: created.version },
      projectId
    );
    return toEstimateResponse(created);
  }

  async getEstimate(user: RequestUser, projectId: string, estimateId: string) {
    await this.access.assertCanManage(user, projectId);
    return toEstimateResponse(await this.findEstimate(projectId, estimateId));
  }

  async addEstimateItem(user: RequestUser, projectId: string, estimateId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const estimate = await this.findEstimate(projectId, estimateId);
    this.assertEstimateEditable(estimate);
    const input = parseBody(costLineItemSchema, rawBody);
    const lineTotalMinor = computeLineTotalMinor(input.quantity, input.unitRate);

    const item = await this.prisma.costEstimateItem.create({
      data: {
        estimateId,
        description: input.description.trim(),
        unit: input.unit,
        quantityMilli: input.quantity,
        unitRateMinor: input.unitRate,
        lineTotalMinor,
        note: emptyToNull(input.note),
        sortOrder: input.sortOrder
      }
    });

    await this.audit.record(user, "finance.estimate_item_added", { estimateId, itemId: item.id }, projectId);
    return this.getEstimate(user, projectId, estimateId);
  }

  async updateEstimateItem(user: RequestUser, projectId: string, estimateId: string, itemId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const estimate = await this.findEstimate(projectId, estimateId);
    this.assertEstimateEditable(estimate);
    const item = estimate.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException("Estimate item not found.");
    const input = parseBody(updateCostLineItemSchema, rawBody);

    const quantityMilli = input.quantity ?? item.quantityMilli;
    const unitRateMinor = input.unitRate ?? item.unitRateMinor;

    await this.prisma.costEstimateItem.update({
      where: { id: itemId },
      data: {
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.quantity !== undefined ? { quantityMilli: input.quantity } : {}),
        ...(input.unitRate !== undefined ? { unitRateMinor: input.unitRate } : {}),
        ...(input.note !== undefined ? { note: emptyToNull(input.note) } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        lineTotalMinor: computeLineTotalMinor(quantityMilli, unitRateMinor)
      }
    });

    await this.audit.record(user, "finance.estimate_item_updated", { estimateId, itemId }, projectId);
    return this.getEstimate(user, projectId, estimateId);
  }

  async removeEstimateItem(user: RequestUser, projectId: string, estimateId: string, itemId: string) {
    await this.access.assertCanManage(user, projectId);
    const estimate = await this.findEstimate(projectId, estimateId);
    this.assertEstimateEditable(estimate);
    const item = estimate.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException("Estimate item not found.");

    await this.prisma.costEstimateItem.delete({ where: { id: itemId } });
    await this.audit.record(user, "finance.estimate_item_removed", { estimateId, itemId }, projectId);
    return this.getEstimate(user, projectId, estimateId);
  }

  private async findEstimate(projectId: string, estimateId: string) {
    const estimate = await this.prisma.costEstimate.findFirst({ where: { id: estimateId, projectId }, include: estimateInclude });
    if (!estimate) throw new NotFoundException("Cost estimate not found.");
    return estimate;
  }

  private assertEstimateEditable(estimate: { isCurrent: boolean }) {
    if (!estimate.isCurrent) {
      throw new ConflictException("This estimate version is finalized and read-only.");
    }
  }

  // ---------------------------------------------------------------------------
  // Bill of Quantities register
  // ---------------------------------------------------------------------------

  async listBoqItems(user: RequestUser, projectId: string, section?: string) {
    await this.access.assertCanViewBoq(user, projectId);
    const items = await this.prisma.bOQItem.findMany({
      where: { projectId, ...(section ? { section } : {}) },
      include: boqItemInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    const sectionTotals = new Map<string, number>();
    let overallTotalMinor = 0;
    for (const item of items) {
      overallTotalMinor += item.lineTotalMinor;
      const key = item.section ?? "";
      sectionTotals.set(key, (sectionTotals.get(key) ?? 0) + item.lineTotalMinor);
    }

    return {
      items: items.map(toBoqItemResponse),
      overallTotal: formatMoneyMajor(overallTotalMinor),
      sectionTotals: [...sectionTotals.entries()].map(([sectionName, totalMinor]) => ({
        section: sectionName || null,
        total: formatMoneyMajor(totalMinor)
      }))
    };
  }

  async createBoqItem(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const input = parseBody(boqItemSchema, rawBody);
    const lineTotalMinor = computeLineTotalMinor(input.quantity, input.unitRate);

    const item = await this.prisma.bOQItem.create({
      data: {
        projectId,
        code: input.code.trim(),
        section: emptyToNull(input.section),
        description: input.description.trim(),
        unit: input.unit,
        quantityMilli: input.quantity,
        unitRateMinor: input.unitRate,
        lineTotalMinor,
        note: emptyToNull(input.note),
        sortOrder: input.sortOrder,
        createdById: user.id
      },
      include: boqItemInclude
    });

    await this.audit.record(user, "finance.boq_item_created", { itemId: item.id, code: item.code }, projectId);
    return toBoqItemResponse(item);
  }

  async updateBoqItem(user: RequestUser, projectId: string, itemId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findBoqItem(projectId, itemId);
    const input = parseBody(updateBoqItemSchema, rawBody);

    const quantityMilli = input.quantity ?? existing.quantityMilli;
    const unitRateMinor = input.unitRate ?? existing.unitRateMinor;

    const item = await this.prisma.bOQItem.update({
      where: { id: itemId },
      data: {
        ...(input.code !== undefined ? { code: input.code.trim() } : {}),
        ...(input.section !== undefined ? { section: emptyToNull(input.section) } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.quantity !== undefined ? { quantityMilli: input.quantity } : {}),
        ...(input.unitRate !== undefined ? { unitRateMinor: input.unitRate } : {}),
        ...(input.note !== undefined ? { note: emptyToNull(input.note) } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        lineTotalMinor: computeLineTotalMinor(quantityMilli, unitRateMinor)
      },
      include: boqItemInclude
    });

    await this.audit.record(user, "finance.boq_item_updated", { itemId }, projectId);
    return toBoqItemResponse(item);
  }

  async removeBoqItem(user: RequestUser, projectId: string, itemId: string) {
    await this.access.assertCanManage(user, projectId);
    await this.findBoqItem(projectId, itemId);
    await this.prisma.bOQItem.delete({ where: { id: itemId } });
    await this.audit.record(user, "finance.boq_item_deleted", { itemId }, projectId);
    return { ok: true };
  }

  private async findBoqItem(projectId: string, itemId: string) {
    const item = await this.prisma.bOQItem.findFirst({ where: { id: itemId, projectId } });
    if (!item) throw new NotFoundException("BOQ item not found.");
    return item;
  }

  // ---------------------------------------------------------------------------
  // Internal expenses
  // ---------------------------------------------------------------------------

  async listExpenses(user: RequestUser, projectId: string, category?: string, from?: string, to?: string) {
    await this.access.assertCanManage(user, projectId);
    if (category && !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
      throw new BadRequestException("Invalid expense category.");
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        projectId,
        ...(category ? { category: category as ExpenseCategory } : {}),
        ...(from || to
          ? {
              expenseDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
              }
            }
          : {})
      },
      include: expenseInclude,
      orderBy: { expenseDate: "desc" }
    });

    return expenses.map(toExpenseResponse);
  }

  async createExpense(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const input = parseBody(expenseSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      const expense = await this.prisma.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            projectId,
            category: input.category,
            description: input.description.trim(),
            amountMinor: input.amount,
            expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`),
            vendor: emptyToNull(input.vendor),
            reference: emptyToNull(input.reference),
            note: emptyToNull(input.note),
            createdById: user.id
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "EXPENSE",
              expenseId: created.id,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
        return created;
      });
      persisted = true;
      await this.audit.record(user, "finance.expense_recorded", { expenseId: expense.id, amount: input.amount }, projectId);
      return this.getExpense(user, projectId, expense.id);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async updateExpense(user: RequestUser, projectId: string, expenseId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findExpense(projectId, expenseId);
    if (existing.status === "VOID") throw new ConflictException("A voided expense cannot be edited.");
    const input = parseBody(updateExpenseSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.expense.update({
          where: { id: expenseId },
          data: {
            ...(input.category !== undefined ? { category: input.category } : {}),
            ...(input.description !== undefined ? { description: input.description.trim() } : {}),
            ...(input.amount !== undefined ? { amountMinor: input.amount } : {}),
            ...(input.expenseDate !== undefined ? { expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`) } : {}),
            ...(input.vendor !== undefined ? { vendor: emptyToNull(input.vendor) } : {}),
            ...(input.reference !== undefined ? { reference: emptyToNull(input.reference) } : {}),
            ...(input.note !== undefined ? { note: emptyToNull(input.note) } : {})
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "EXPENSE",
              expenseId,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
      });
      persisted = true;
      await this.audit.record(user, "finance.expense_updated", { expenseId }, projectId);
      return this.getExpense(user, projectId, expenseId);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async voidExpense(user: RequestUser, projectId: string, expenseId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findExpense(projectId, expenseId);
    if (existing.status === "VOID") throw new ConflictException("This expense is already void.");
    const input = parseBody(voidRecordSchema, rawBody);

    await this.prisma.expense.update({ where: { id: expenseId }, data: { status: "VOID", voidReason: input.reason.trim() } });
    await this.audit.record(user, "finance.expense_voided", { expenseId, reason: input.reason.trim() }, projectId);
    return this.getExpense(user, projectId, expenseId);
  }

  async getExpense(user: RequestUser, projectId: string, expenseId: string) {
    await this.access.assertCanManage(user, projectId);
    return toExpenseResponse(await this.findExpense(projectId, expenseId));
  }

  async getExpenseAttachmentFile(user: RequestUser, projectId: string, expenseId: string, attachmentId: string) {
    await this.access.assertCanManage(user, projectId);
    const attachment = await this.prisma.financialAttachment.findFirst({
      where: { id: attachmentId, expenseId, projectId, kind: "EXPENSE" }
    });
    if (!attachment) throw new NotFoundException("Attachment not found.");
    return attachment;
  }

  private async findExpense(projectId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, projectId }, include: expenseInclude });
    if (!expense) throw new NotFoundException("Expense not found.");
    return expense;
  }

  // ---------------------------------------------------------------------------
  // Client (incoming) payments
  // ---------------------------------------------------------------------------

  async listClientPayments(user: RequestUser, projectId: string, from?: string, to?: string) {
    const isClient = user.role === "CLIENT";
    if (isClient) {
      await this.access.assertCanViewClientSummary(user, projectId);
    } else {
      await this.access.assertCanManage(user, projectId);
    }

    const payments = await this.prisma.clientPayment.findMany({
      where: {
        projectId,
        ...(isClient ? { status: "ACTIVE" } : {}),
        ...(from || to
          ? {
              paymentDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
              }
            }
          : {})
      },
      include: clientPaymentInclude,
      orderBy: { paymentDate: "desc" }
    });

    return payments.map(isClient ? toClientSafePaymentResponse : toClientPaymentResponse);
  }

  async createClientPayment(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const input = parseBody(clientPaymentSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.clientPayment.create({
          data: {
            projectId,
            amountMinor: input.amount,
            paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
            method: input.method,
            reference: emptyToNull(input.reference),
            description: emptyToNull(input.description),
            createdById: user.id
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "CLIENT_PAYMENT",
              clientPaymentId: created.id,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
        return created;
      });
      persisted = true;
      await this.audit.record(user, "finance.client_payment_recorded", { paymentId: payment.id, amount: input.amount }, projectId);
      return this.getClientPayment(user, projectId, payment.id);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async updateClientPayment(user: RequestUser, projectId: string, paymentId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findClientPayment(projectId, paymentId);
    if (existing.status === "VOID") throw new ConflictException("A voided payment cannot be edited.");
    const input = parseBody(updateClientPaymentSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.clientPayment.update({
          where: { id: paymentId },
          data: {
            ...(input.amount !== undefined ? { amountMinor: input.amount } : {}),
            ...(input.paymentDate !== undefined ? { paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`) } : {}),
            ...(input.method !== undefined ? { method: input.method } : {}),
            ...(input.reference !== undefined ? { reference: emptyToNull(input.reference) } : {}),
            ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {})
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "CLIENT_PAYMENT",
              clientPaymentId: paymentId,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
      });
      persisted = true;
      await this.audit.record(user, "finance.client_payment_updated", { paymentId }, projectId);
      return this.getClientPayment(user, projectId, paymentId);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async voidClientPayment(user: RequestUser, projectId: string, paymentId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findClientPayment(projectId, paymentId);
    if (existing.status === "VOID") throw new ConflictException("This payment is already void.");
    const input = parseBody(voidRecordSchema, rawBody);

    await this.prisma.clientPayment.update({ where: { id: paymentId }, data: { status: "VOID", voidReason: input.reason.trim() } });
    await this.audit.record(user, "finance.client_payment_voided", { paymentId, reason: input.reason.trim() }, projectId);
    return this.getClientPayment(user, projectId, paymentId);
  }

  async getClientPayment(user: RequestUser, projectId: string, paymentId: string) {
    await this.access.assertCanManage(user, projectId);
    return toClientPaymentResponse(await this.findClientPayment(projectId, paymentId));
  }

  async getClientPaymentAttachmentFile(user: RequestUser, projectId: string, paymentId: string, attachmentId: string) {
    if (user.role === "CLIENT") {
      await this.access.assertCanViewClientSummary(user, projectId);
      const attachment = await this.prisma.financialAttachment.findFirst({
        where: { id: attachmentId, clientPaymentId: paymentId, projectId, kind: "CLIENT_PAYMENT" },
        include: { clientPayment: true }
      });
      if (!attachment || attachment.clientPayment?.status !== "ACTIVE") throw new NotFoundException("Attachment not found.");
      return attachment;
    }

    await this.access.assertCanManage(user, projectId);
    const attachment = await this.prisma.financialAttachment.findFirst({
      where: { id: attachmentId, clientPaymentId: paymentId, projectId, kind: "CLIENT_PAYMENT" }
    });
    if (!attachment) throw new NotFoundException("Attachment not found.");
    return attachment;
  }

  private async findClientPayment(projectId: string, paymentId: string) {
    const payment = await this.prisma.clientPayment.findFirst({ where: { id: paymentId, projectId }, include: clientPaymentInclude });
    if (!payment) throw new NotFoundException("Client payment not found.");
    return payment;
  }

  // ---------------------------------------------------------------------------
  // Contractor / subcontractor (outgoing) payments - internal only, never client-visible
  // ---------------------------------------------------------------------------

  async listContractorPayments(user: RequestUser, projectId: string, from?: string, to?: string) {
    await this.access.assertCanManage(user, projectId);
    const payments = await this.prisma.contractorPayment.findMany({
      where: {
        projectId,
        ...(from || to
          ? {
              paymentDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
              }
            }
          : {})
      },
      include: contractorPaymentInclude,
      orderBy: { paymentDate: "desc" }
    });
    return payments.map(toContractorPaymentResponse);
  }

  async createContractorPayment(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const input = parseBody(contractorPaymentSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.contractorPayment.create({
          data: {
            projectId,
            payee: input.payee.trim(),
            amountMinor: input.amount,
            paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
            method: input.method,
            category: input.category ?? null,
            reference: emptyToNull(input.reference),
            description: emptyToNull(input.description),
            createdById: user.id
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "CONTRACTOR_PAYMENT",
              contractorPaymentId: created.id,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
        return created;
      });
      persisted = true;
      await this.audit.record(user, "finance.contractor_payment_recorded", { paymentId: payment.id, amount: input.amount }, projectId);
      return this.getContractorPayment(user, projectId, payment.id);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async updateContractorPayment(user: RequestUser, projectId: string, paymentId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findContractorPayment(projectId, paymentId);
    if (existing.status === "VOID") throw new ConflictException("A voided payment cannot be edited.");
    const input = parseBody(updateContractorPaymentSchema, rawBody);
    const stored = file ? await this.storage.storeFinanceAttachment(projectId, file) : null;
    let persisted = false;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contractorPayment.update({
          where: { id: paymentId },
          data: {
            ...(input.payee !== undefined ? { payee: input.payee.trim() } : {}),
            ...(input.amount !== undefined ? { amountMinor: input.amount } : {}),
            ...(input.paymentDate !== undefined ? { paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`) } : {}),
            ...(input.method !== undefined ? { method: input.method } : {}),
            ...(input.category !== undefined ? { category: input.category } : {}),
            ...(input.reference !== undefined ? { reference: emptyToNull(input.reference) } : {}),
            ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {})
          }
        });
        if (stored && file) {
          await tx.financialAttachment.create({
            data: {
              projectId,
              kind: "CONTRACTOR_PAYMENT",
              contractorPaymentId: paymentId,
              storagePath: stored.storagePath,
              storedFilename: stored.storedFilename,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              uploadedById: user.id
            }
          });
        }
      });
      persisted = true;
      await this.audit.record(user, "finance.contractor_payment_updated", { paymentId }, projectId);
      return this.getContractorPayment(user, projectId, paymentId);
    } finally {
      if (!persisted && stored) await this.storage.remove(stored.storagePath);
    }
  }

  async voidContractorPayment(user: RequestUser, projectId: string, paymentId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const existing = await this.findContractorPayment(projectId, paymentId);
    if (existing.status === "VOID") throw new ConflictException("This payment is already void.");
    const input = parseBody(voidRecordSchema, rawBody);

    await this.prisma.contractorPayment.update({ where: { id: paymentId }, data: { status: "VOID", voidReason: input.reason.trim() } });
    await this.audit.record(user, "finance.contractor_payment_voided", { paymentId, reason: input.reason.trim() }, projectId);
    return this.getContractorPayment(user, projectId, paymentId);
  }

  async getContractorPayment(user: RequestUser, projectId: string, paymentId: string) {
    await this.access.assertCanManage(user, projectId);
    return toContractorPaymentResponse(await this.findContractorPayment(projectId, paymentId));
  }

  async getContractorPaymentAttachmentFile(user: RequestUser, projectId: string, paymentId: string, attachmentId: string) {
    await this.access.assertCanManage(user, projectId);
    const attachment = await this.prisma.financialAttachment.findFirst({
      where: { id: attachmentId, contractorPaymentId: paymentId, projectId, kind: "CONTRACTOR_PAYMENT" }
    });
    if (!attachment) throw new NotFoundException("Attachment not found.");
    return attachment;
  }

  private async findContractorPayment(projectId: string, paymentId: string) {
    const payment = await this.prisma.contractorPayment.findFirst({ where: { id: paymentId, projectId }, include: contractorPaymentInclude });
    if (!payment) throw new NotFoundException("Contractor payment not found.");
    return payment;
  }

  // ---------------------------------------------------------------------------
  // Financial audit history
  // ---------------------------------------------------------------------------

  async getHistory(user: RequestUser, projectId: string) {
    await this.access.assertCanManage(user, projectId);
    const logs = await this.prisma.auditLog.findMany({
      where: { projectId, action: { startsWith: "finance." } },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      actor: log.actor ? { id: log.actor.id, displayName: log.actor.displayName, role: log.actor.role } : null,
      createdAt: log.createdAt.toISOString()
    }));
  }
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
