import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ExpenseCategory, FinancialRecordStatus, PaymentMethod } from "@elhabak/database";
import { formatMoneyMajor } from "@elhabak/validation";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import {
  toBoqItemResponse,
  toClientPaymentResponse,
  toContractorPaymentResponse,
  toEstimateItemResponse,
  toExpenseResponse,
  boqItemInclude,
  clientPaymentInclude,
  contractorPaymentInclude,
  expenseInclude
} from "./finance-response";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVITY_LIMIT = 400;
const REPORT_ROW_LIMIT = 500;

export const EXPENSE_CATEGORY_VALUES: ExpenseCategory[] = ["MATERIAL", "LABOR", "TRANSPORT", "EQUIPMENT", "SUBCONTRACTOR", "OTHER"];
export const PAYMENT_METHOD_VALUES: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"];

export type PortfolioQuery = {
  projectIds?: string[] | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

export type ActivityQuery = PortfolioQuery & {
  kind?: string | undefined;
  status?: string | undefined;
  category?: string | undefined;
  method?: string | undefined;
  vendor?: string | undefined;
};

export const REPORT_SECTIONS = [
  "executive",
  "contract",
  "collections",
  "outstanding",
  "boq",
  "estimates",
  "expenses",
  "contractorPayments",
  "cost",
  "activity"
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

export type ReportQuery = PortfolioQuery & {
  sections?: string[] | undefined;
  detail?: string | undefined;
};

type ProjectIdentity = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  phase: string;
  progress: number;
  category: string;
  clientName: string | null;
};

type ProjectTotals = {
  contractValueMinor: number | null;
  boqTotalMinor: number;
  estimateTotalMinor: number | null;
  clientPaymentsTotalMinor: number;
  expensesTotalMinor: number;
  contractorPaymentsTotalMinor: number;
  committedCostTotalMinor: number;
  outstandingBalanceMinor: number | null;
};

/**
 * Company-wide Finance Control Center aggregates. Every figure is derived from the
 * same persisted records the per-project finance workspace uses (ACTIVE ledgers,
 * integer minor-unit arithmetic, current estimate version only) - the service only
 * batches the canonical per-project math across a scope instead of inventing a
 * second accounting model.
 */
@Injectable()
export class FinancePortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------ scope + filters ---------------------------- */

  private assertFinanceRole(user: RequestUser) {
    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      throw new ForbiddenException("Finance access denied.");
    }
  }

  private assertDate(value: string | undefined, field: string) {
    if (value === undefined) return undefined;
    // Reject impossible calendar dates too ("2026-99-01" matches the pattern but
    // produces an Invalid Date that would fail inside Prisma with a 500).
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!DATE_PATTERN.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException(`Invalid ${field} date. Use YYYY-MM-DD.`);
    }
    return value;
  }

  private async resolveScope(projectIds: string[] | undefined): Promise<ProjectIdentity[]> {
    const requested = projectIds?.filter(Boolean) ?? [];
    const projects = await this.prisma.project.findMany({
      where: requested.length ? { id: { in: requested } } : {},
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        phase: true,
        progress: true,
        category: true,
        client: { select: { user: { select: { displayName: true } } } }
      },
      orderBy: { updatedAt: "desc" }
    });

    if (requested.length) {
      const found = new Set(projects.map((project) => project.id));
      const missing = requested.filter((id) => !found.has(id));
      if (missing.length) throw new NotFoundException("One or more projects were not found.");
      // Preserve the caller's selection order for deterministic report output.
      const byId = new Map(projects.map((project) => [project.id, project]));
      return requested
        .map((id) => byId.get(id)!)
        .map((project) => ({
          id: project.id,
          code: project.code,
          name: project.name,
          status: project.status,
          phase: project.phase,
          progress: project.progress,
          category: project.category,
          clientName: project.client?.user.displayName ?? null
        }));
    }

    return projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      phase: project.phase,
      progress: project.progress,
      category: project.category,
      clientName: project.client?.user.displayName ?? null
    }));
  }

  private dateFilters(query: PortfolioQuery) {
    const from = this.assertDate(query.from, "from");
    const to = this.assertDate(query.to, "to");
    if (from && to && from > to) {
      throw new BadRequestException("The from date must not be after the to date.");
    }
    const paymentDate = from || to
      ? {
          ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
        }
      : undefined;
    return { from, to, paymentDate, expenseDate: paymentDate };
  }

  /* ------------------------------ canonical totals --------------------------- */

  private async projectTotals(ids: string[], query: PortfolioQuery): Promise<Map<string, ProjectTotals>> {
    const dates = this.dateFilters(query);
    const scope = { projectId: { in: ids } };
    const [profiles, boqSums, estimates, clientSums, expenseSums, contractorSums] = await Promise.all([
      this.prisma.projectFinancialProfile.findMany({ where: scope }),
      this.prisma.bOQItem.groupBy({ by: ["projectId"], where: scope, _sum: { lineTotalMinor: true } }),
      this.prisma.costEstimate.findMany({
        where: { ...scope, isCurrent: true },
        select: { projectId: true, items: { select: { lineTotalMinor: true } } }
      }),
      this.prisma.clientPayment.groupBy({
        by: ["projectId"],
        where: { ...scope, status: "ACTIVE", ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {}) },
        _sum: { amountMinor: true }
      }),
      this.prisma.expense.groupBy({
        by: ["projectId"],
        where: { ...scope, status: "ACTIVE", ...(dates.expenseDate ? { expenseDate: dates.expenseDate } : {}) },
        _sum: { amountMinor: true }
      }),
      this.prisma.contractorPayment.groupBy({
        by: ["projectId"],
        where: { ...scope, status: "ACTIVE", ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {}) },
        _sum: { amountMinor: true }
      })
    ]);

    const contractByProject = new Map(profiles.map((profile) => [profile.projectId, profile.contractValueMinor]));
    const boqByProject = new Map(boqSums.map((row) => [row.projectId, row._sum.lineTotalMinor ?? 0]));
    const estimateByProject = new Map(
      estimates.map((estimate) => [estimate.projectId, estimate.items.reduce((sum, item) => sum + item.lineTotalMinor, 0)])
    );
    const clientByProject = new Map(clientSums.map((row) => [row.projectId, row._sum.amountMinor ?? 0]));
    const expenseByProject = new Map(expenseSums.map((row) => [row.projectId, row._sum.amountMinor ?? 0]));
    const contractorByProject = new Map(contractorSums.map((row) => [row.projectId, row._sum.amountMinor ?? 0]));

    const totals = new Map<string, ProjectTotals>();
    for (const id of ids) {
      const contractValueMinor = contractByProject.get(id) ?? null;
      const clientPaymentsTotalMinor = clientByProject.get(id) ?? 0;
      const expensesTotalMinor = expenseByProject.get(id) ?? 0;
      const contractorPaymentsTotalMinor = contractorByProject.get(id) ?? 0;
      totals.set(id, {
        contractValueMinor,
        boqTotalMinor: boqByProject.get(id) ?? 0,
        estimateTotalMinor: estimateByProject.has(id) ? estimateByProject.get(id)! : null,
        clientPaymentsTotalMinor,
        expensesTotalMinor,
        contractorPaymentsTotalMinor,
        committedCostTotalMinor: expensesTotalMinor + contractorPaymentsTotalMinor,
        outstandingBalanceMinor: contractValueMinor === null ? null : contractValueMinor - clientPaymentsTotalMinor
      });
    }
    return totals;
  }

  private serializeTotals(totals: ProjectTotals) {
    const netCashMinor = totals.clientPaymentsTotalMinor - totals.committedCostTotalMinor;
    const contract = totals.contractValueMinor;
    return {
      contractValue: contract === null ? null : formatMoneyMajor(contract),
      boqTotal: formatMoneyMajor(totals.boqTotalMinor),
      estimateTotal: totals.estimateTotalMinor === null ? null : formatMoneyMajor(totals.estimateTotalMinor),
      clientPaymentsTotal: formatMoneyMajor(totals.clientPaymentsTotalMinor),
      outstandingBalance: totals.outstandingBalanceMinor === null ? null : formatMoneyMajor(totals.outstandingBalanceMinor),
      expensesTotal: formatMoneyMajor(totals.expensesTotalMinor),
      contractorPaymentsTotal: formatMoneyMajor(totals.contractorPaymentsTotalMinor),
      committedCostTotal: formatMoneyMajor(totals.committedCostTotalMinor),
      cashInTotal: formatMoneyMajor(totals.clientPaymentsTotalMinor),
      cashOutTotal: formatMoneyMajor(totals.committedCostTotalMinor),
      netCashPosition: formatMoneyMajor(netCashMinor),
      collectionPercent: contract !== null && contract > 0 ? round1((totals.clientPaymentsTotalMinor / contract) * 100) : null,
      costVsContractPercent: contract !== null && contract > 0 ? round1((totals.committedCostTotalMinor / contract) * 100) : null
    };
  }

  /* ------------------------------- portfolio API ----------------------------- */

  async getPortfolio(user: RequestUser, query: PortfolioQuery) {
    this.assertFinanceRole(user);
    const projects = await this.resolveScope(query.projectIds);
    const totalsByProject = await this.projectTotals(projects.map((project) => project.id), query);
    const dates = this.dateFilters(query);

    const combined = emptyTotals();
    const rows = projects.map((project) => {
      const totals = totalsByProject.get(project.id) ?? emptyTotals();
      mergeInto(combined, totals);
      return { ...project, summary: this.serializeTotals(totals) };
    });

    return {
      generatedAt: new Date().toISOString(),
      scope: query.projectIds?.length ? (query.projectIds.length === 1 ? "ONE" : "SELECTED") : "ALL",
      filters: { from: dates.from ?? null, to: dates.to ?? null },
      currency: "EGP",
      projectCount: rows.length,
      totals: this.serializeTotals(combined),
      projects: rows
    };
  }

  async getActivity(user: RequestUser, query: ActivityQuery) {
    this.assertFinanceRole(user);
    const projects = await this.resolveScope(query.projectIds);
    const ids = projects.map((project) => project.id);
    const dates = this.dateFilters(query);
    const projectById = new Map(projects.map((project) => [project.id, project]));

    const kind = (query.kind ?? "ALL").toUpperCase();
    if (!["ALL", "EXPENSE", "CLIENT_PAYMENT", "CONTRACTOR_PAYMENT"].includes(kind)) {
      throw new BadRequestException("Invalid record type filter.");
    }
    const status = (query.status ?? "ALL").toUpperCase();
    if (!["ALL", "ACTIVE", "VOID"].includes(status)) {
      throw new BadRequestException("Invalid record status filter.");
    }
    const statusFilter = status === "ALL" ? undefined : (status as FinancialRecordStatus);
    const category = query.category?.trim();
    if (category && !EXPENSE_CATEGORY_VALUES.includes(category as ExpenseCategory)) {
      throw new BadRequestException("Invalid expense category filter.");
    }
    const method = query.method?.trim();
    if (method && !PAYMENT_METHOD_VALUES.includes(method as PaymentMethod)) {
      throw new BadRequestException("Invalid payment method filter.");
    }
    const vendor = query.vendor?.trim();

    const rows: Array<Record<string, unknown>> = [];

    if (kind === "ALL" || kind === "EXPENSE") {
      const expenses = await this.prisma.expense.findMany({
        where: {
          projectId: { in: ids },
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(category ? { category: category as ExpenseCategory } : {}),
          ...(vendor ? { vendor: { contains: vendor, mode: "insensitive" } } : {}),
          ...(dates.expenseDate ? { expenseDate: dates.expenseDate } : {})
        },
        orderBy: { expenseDate: "desc" },
        take: ACTIVITY_LIMIT
      });
      for (const expense of expenses) {
        rows.push({
          id: expense.id,
          kind: "EXPENSE",
          project: projectById.get(expense.projectId) ?? null,
          date: expense.expenseDate.toISOString(),
          label: expense.description,
          party: expense.vendor,
          category: expense.category,
          method: null,
          reference: expense.reference,
          amount: formatMoneyMajor(expense.amountMinor),
          currency: expense.currency,
          status: expense.status,
          voidReason: expense.voidReason
        });
      }
    }

    // Client payments carry no vendor/payee field, so a vendor filter narrows the
    // ledger to expenses and contractor payments only.
    if (!vendor && (kind === "ALL" || kind === "CLIENT_PAYMENT")) {
      const payments = await this.prisma.clientPayment.findMany({
        where: {
          projectId: { in: ids },
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(method ? { method: method as PaymentMethod } : {}),
          ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {})
        },
        orderBy: { paymentDate: "desc" },
        take: ACTIVITY_LIMIT
      });
      for (const payment of payments) {
        rows.push({
          id: payment.id,
          kind: "CLIENT_PAYMENT",
          project: projectById.get(payment.projectId) ?? null,
          date: payment.paymentDate.toISOString(),
          label: payment.description ?? null,
          party: projectById.get(payment.projectId)?.clientName ?? null,
          category: null,
          method: payment.method,
          reference: payment.reference,
          amount: formatMoneyMajor(payment.amountMinor),
          currency: payment.currency,
          status: payment.status,
          voidReason: payment.voidReason
        });
      }
    }

    if (kind === "ALL" || kind === "CONTRACTOR_PAYMENT") {
      const payments = await this.prisma.contractorPayment.findMany({
        where: {
          projectId: { in: ids },
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(category ? { category: category as ExpenseCategory } : {}),
          ...(method ? { method: method as PaymentMethod } : {}),
          ...(vendor ? { payee: { contains: vendor, mode: "insensitive" } } : {}),
          ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {})
        },
        orderBy: { paymentDate: "desc" },
        take: ACTIVITY_LIMIT
      });
      for (const payment of payments) {
        rows.push({
          id: payment.id,
          kind: "CONTRACTOR_PAYMENT",
          project: projectById.get(payment.projectId) ?? null,
          date: payment.paymentDate.toISOString(),
          label: payment.description ?? null,
          party: payment.payee,
          category: payment.category,
          method: payment.method,
          reference: payment.reference,
          amount: formatMoneyMajor(payment.amountMinor),
          currency: payment.currency,
          status: payment.status,
          voidReason: payment.voidReason
        });
      }
    }

    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const limited = rows.slice(0, ACTIVITY_LIMIT);

    return {
      generatedAt: new Date().toISOString(),
      scope: query.projectIds?.length ? (query.projectIds.length === 1 ? "ONE" : "SELECTED") : "ALL",
      filters: {
        from: dates.from ?? null,
        to: dates.to ?? null,
        kind,
        status,
        category: category ?? null,
        method: method ?? null,
        vendor: vendor ?? null
      },
      truncated: rows.length > ACTIVITY_LIMIT,
      count: limited.length,
      rows: limited
    };
  }

  /* ------------------------------ report builder ----------------------------- */

  private parseSections(raw: string[] | undefined): ReportSection[] {
    if (!raw || raw.length === 0) return [...REPORT_SECTIONS];
    const sections = raw.filter(Boolean) as ReportSection[];
    for (const section of sections) {
      if (!REPORT_SECTIONS.includes(section)) {
        throw new BadRequestException(`Unknown report section "${section}".`);
      }
    }
    return sections.length ? sections : [...REPORT_SECTIONS];
  }

  async buildReport(user: RequestUser, query: ReportQuery) {
    this.assertFinanceRole(user);
    const sections = this.parseSections(query.sections);
    const detailed = query.detail !== "summary";
    const projects = await this.resolveScope(query.projectIds);
    const ids = projects.map((project) => project.id);
    const dates = this.dateFilters(query);
    const totalsByProject = await this.projectTotals(ids, query);

    const wants = {
      boq: sections.includes("boq"),
      estimates: sections.includes("estimates"),
      expenses: sections.includes("expenses"),
      collections: sections.includes("collections"),
      contractorPayments: sections.includes("contractorPayments"),
      activity: sections.includes("activity")
    };

    const scope = { projectId: { in: ids } };
    const [boqItems, estimates, expenses, clientPayments, contractorPayments, activity] = await Promise.all([
      wants.boq
        ? this.prisma.bOQItem.findMany({
            where: scope,
            include: boqItemInclude,
            orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([]),
      wants.estimates
        ? this.prisma.costEstimate.findMany({
            where: scope,
            include: { items: { orderBy: { sortOrder: "asc" } }, createdBy: true },
            orderBy: [{ projectId: "asc" }, { version: "desc" }],
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([]),
      wants.expenses
        ? this.prisma.expense.findMany({
            where: { ...scope, ...(dates.expenseDate ? { expenseDate: dates.expenseDate } : {}) },
            include: expenseInclude,
            orderBy: { expenseDate: "desc" },
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([]),
      wants.collections
        ? this.prisma.clientPayment.findMany({
            where: { ...scope, ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {}) },
            include: clientPaymentInclude,
            orderBy: { paymentDate: "desc" },
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([]),
      wants.contractorPayments
        ? this.prisma.contractorPayment.findMany({
            where: { ...scope, ...(dates.paymentDate ? { paymentDate: dates.paymentDate } : {}) },
            include: contractorPaymentInclude,
            orderBy: { paymentDate: "desc" },
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([]),
      wants.activity
        ? this.prisma.auditLog.findMany({
            where: { projectId: { in: ids }, action: { startsWith: "finance." } },
            include: { actor: { select: { displayName: true, role: true } } },
            orderBy: { createdAt: "desc" },
            take: REPORT_ROW_LIMIT
          })
        : Promise.resolve([])
    ]);

    const combined = emptyTotals();
    const reportProjects = projects.map((project) => {
      const totals = totalsByProject.get(project.id) ?? emptyTotals();
      mergeInto(combined, totals);
      const pid = project.id;

      const projectBoq = wants.boq ? boqItems.filter((item) => item.projectId === pid) : [];
      const boqSectionTotals = new Map<string, number>();
      for (const item of projectBoq) {
        const key = item.section ?? "";
        boqSectionTotals.set(key, (boqSectionTotals.get(key) ?? 0) + item.lineTotalMinor);
      }

      const projectEstimates = wants.estimates ? estimates.filter((estimate) => estimate.projectId === pid) : [];
      const projectExpenses = wants.expenses ? expenses.filter((expense) => expense.projectId === pid) : [];
      const projectCollections = wants.collections ? clientPayments.filter((payment) => payment.projectId === pid) : [];
      const projectContractors = wants.contractorPayments ? contractorPayments.filter((payment) => payment.projectId === pid) : [];
      const projectActivity = wants.activity ? activity.filter((log) => log.projectId === pid) : [];

      const expenseByCategory = new Map<string, number>();
      for (const expense of projectExpenses) {
        if (expense.status !== "ACTIVE") continue;
        expenseByCategory.set(expense.category, (expenseByCategory.get(expense.category) ?? 0) + expense.amountMinor);
      }

      return {
        project,
        summary: this.serializeTotals(totals),
        sections: {
          ...(wants.boq
            ? {
                boq: {
                  sectionTotals: [...boqSectionTotals.entries()].map(([section, total]) => ({
                    section: section || null,
                    total: formatMoneyMajor(total)
                  })),
                  ...(detailed ? { items: projectBoq.map(toBoqItemResponse) } : {})
                }
              }
            : {}),
          ...(wants.estimates
            ? {
                estimates: projectEstimates.map((estimate) => ({
                  id: estimate.id,
                  title: estimate.title,
                  version: estimate.version,
                  isCurrent: estimate.isCurrent,
                  total: formatMoneyMajor(estimate.items.reduce((sum, item) => sum + item.lineTotalMinor, 0)),
                  createdBy: estimate.createdBy.displayName,
                  createdAt: estimate.createdAt.toISOString(),
                  ...(detailed ? { items: estimate.items.map(toEstimateItemResponse) } : {})
                }))
              }
            : {}),
          ...(wants.expenses
            ? {
                expenses: {
                  byCategory: [...expenseByCategory.entries()].map(([category, total]) => ({
                    category,
                    total: formatMoneyMajor(total)
                  })),
                  ...(detailed ? { rows: projectExpenses.map(toExpenseResponse) } : {})
                }
              }
            : {}),
          ...(wants.collections
            ? {
                collections: detailed
                  ? { rows: projectCollections.map(toClientPaymentResponse) }
                  : {
                      count: projectCollections.filter((payment) => payment.status === "ACTIVE").length,
                      total: formatMoneyMajor(
                        projectCollections
                          .filter((payment) => payment.status === "ACTIVE")
                          .reduce((sum, payment) => sum + payment.amountMinor, 0)
                      )
                    }
              }
            : {}),
          ...(wants.contractorPayments
            ? {
                contractorPayments: detailed
                  ? { rows: projectContractors.map(toContractorPaymentResponse) }
                  : {
                      count: projectContractors.filter((payment) => payment.status === "ACTIVE").length,
                      total: formatMoneyMajor(
                        projectContractors
                          .filter((payment) => payment.status === "ACTIVE")
                          .reduce((sum, payment) => sum + payment.amountMinor, 0)
                      )
                    }
              }
            : {}),
          ...(wants.activity
            ? {
                activity: projectActivity.map((log) => ({
                  id: log.id,
                  action: log.action,
                  actorName: log.actor?.displayName ?? null,
                  createdAt: log.createdAt.toISOString()
                }))
              }
            : {})
        }
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      scope: query.projectIds?.length ? (query.projectIds.length === 1 ? "ONE" : "SELECTED") : "ALL",
      detail: detailed ? "DETAILED" : "SUMMARY",
      sections,
      filters: { from: dates.from ?? null, to: dates.to ?? null },
      currency: "EGP",
      projectCount: reportProjects.length,
      totals: this.serializeTotals(combined),
      projects: reportProjects
    };
  }
}

function emptyTotals(): ProjectTotals {
  return {
    contractValueMinor: null,
    boqTotalMinor: 0,
    estimateTotalMinor: null,
    clientPaymentsTotalMinor: 0,
    expensesTotalMinor: 0,
    contractorPaymentsTotalMinor: 0,
    committedCostTotalMinor: 0,
    outstandingBalanceMinor: null
  };
}

function mergeInto(target: ProjectTotals, source: ProjectTotals) {
  // null contract means "not recorded": the combined figure stays null only while
  // no project in scope has a contract value.
  if (source.contractValueMinor !== null) {
    target.contractValueMinor = (target.contractValueMinor ?? 0) + source.contractValueMinor;
  }
  target.boqTotalMinor += source.boqTotalMinor;
  if (source.estimateTotalMinor !== null) {
    target.estimateTotalMinor = (target.estimateTotalMinor ?? 0) + source.estimateTotalMinor;
  }
  target.clientPaymentsTotalMinor += source.clientPaymentsTotalMinor;
  target.expensesTotalMinor += source.expensesTotalMinor;
  target.contractorPaymentsTotalMinor += source.contractorPaymentsTotalMinor;
  target.committedCostTotalMinor += source.committedCostTotalMinor;
  target.outstandingBalanceMinor =
    target.contractValueMinor === null ? null : target.contractValueMinor - target.clientPaymentsTotalMinor;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
