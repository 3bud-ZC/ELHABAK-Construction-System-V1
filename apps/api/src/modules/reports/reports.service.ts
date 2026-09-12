import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { formatMoneyMajor, formatQuantityMajor } from "@elhabak/validation";
import type { Prisma } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

const projectIdentitySelect = {
  id: true,
  code: true,
  name: true,
  category: true,
  phase: true,
  status: true,
  progress: true,
  location: true,
  startDate: true,
  targetDate: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, phone: true, user: { select: { id: true, displayName: true } } } },
  engineer: { select: { id: true, displayName: true } }
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectAccessService
  ) {}

  async listProjects(user: RequestUser, search?: string) {
    this.assertReportRole(user);
    const query = search?.trim();
    const where: Prisma.ProjectWhereInput = {
      ...(user.role === "ADMIN" || user.role === "ACCOUNTANT"
        ? {}
        : this.projects.projectWhereFor(user)),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
              { client: { user: { displayName: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
    };
    const rows = await this.prisma.project.findMany({
      where,
      select: projectIdentitySelect,
      orderBy: { updatedAt: "desc" }
    });
    return rows.map(serializeIdentity);
  }

  async getProjectReport(user: RequestUser, projectId: string) {
    this.assertReportRole(user);
    await this.assertProjectAccess(user, projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: projectIdentitySelect
    });
    if (!project) throw new NotFoundException("Project not found.");

    const isClient = user.role === "CLIENT";
    const canReadOperations = user.role === "ADMIN" || user.role === "ENGINEER" || isClient;
    const [siteUpdates, designs, documents, activity, communication, finance] = await Promise.all([
      canReadOperations
        ? this.prisma.siteUpdate.findMany({
            where: { projectId, ...(isClient ? { isClientVisible: true } : {}) },
            select: {
              id: true,
              type: true,
              phase: true,
              progressImpact: true,
              note: true,
              createdAt: true,
              author: { select: { displayName: true, role: true } },
              _count: { select: { media: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 20
          })
        : Promise.resolve([]),
      canReadOperations
        ? this.prisma.designItem.findMany({
            where: { projectId },
            select: {
              id: true,
              title: true,
              discipline: true,
              status: true,
              currentRevisionNumber: true,
              updatedAt: true
            },
            orderBy: { updatedAt: "desc" }
          })
        : Promise.resolve([]),
      canReadOperations
        ? this.prisma.projectDocument.findMany({
            where: { projectId, ...(isClient ? { status: "ACTIVE", isClientVisible: true } : {}) },
            select: {
              id: true,
              reference: true,
              title: true,
              category: true,
              status: true,
              isClientVisible: true,
              currentVersionNumber: true,
              updatedAt: true
            },
            orderBy: { updatedAt: "desc" }
          })
        : Promise.resolve([]),
      canReadOperations
        ? this.prisma.auditLog.findMany({
            where: {
              projectId,
              ...(isClient
                ? {
                    action: {
                      in: ["project.created", "project.phase_changed", "project.progress_changed"]
                    }
                  }
                : { action: { not: { startsWith: "finance." } } })
            },
            select: {
              id: true,
              action: true,
              createdAt: true,
              actor: { select: { displayName: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 30
          })
        : Promise.resolve([]),
      canReadOperations
        ? this.prisma.projectMessage.aggregate({
            where: { projectId },
            _count: { id: true },
            _max: { createdAt: true }
          })
        : Promise.resolve(null),
      this.getFinance(user, projectId)
    ]);

    return {
      scope: user.role === "ACCOUNTANT" ? "FINANCE" : "PROJECT",
      viewerRole: user.role,
      project: serializeIdentity(project),
      siteOperations: canReadOperations
        ? {
            progress: project.progress,
            currentPhase: project.phase,
            updates: siteUpdates.map((item) => ({
              id: item.id,
              type: item.type,
              phase: item.phase,
              progress: item.progressImpact,
              note: item.note,
              mediaCount: item._count.media,
              author: item.author,
              createdAt: item.createdAt.toISOString()
            }))
          }
        : null,
      designs: canReadOperations
        ? designs.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))
        : null,
      finance,
      documents: canReadOperations
        ? documents.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))
        : null,
      communication: communication
        ? {
            messageCount: communication._count.id,
            lastMessageAt: communication._max.createdAt?.toISOString() ?? null
          }
        : null,
      activity: canReadOperations
        ? activity.map((item) => ({
            id: item.id,
            action: item.action,
            actorName: item.actor?.displayName ?? null,
            createdAt: item.createdAt.toISOString()
          }))
        : null
    };
  }

  private async assertProjectAccess(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      const exists = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true }
      });
      if (!exists) throw new NotFoundException("Project not found.");
      return;
    }
    await this.projects.assertCanRead(user, projectId);
  }

  private assertReportRole(user: RequestUser) {
    if (user.role === "WORKER") throw new ForbiddenException("Report access denied.");
  }

  private async getFinance(user: RequestUser, projectId: string) {
    if (user.role === "ENGINEER") {
      const items = await this.prisma.bOQItem.findMany({
        where: { projectId },
        select: {
          id: true,
          code: true,
          section: true,
          description: true,
          unit: true,
          quantityMilli: true,
          unitRateMinor: true,
          lineTotalMinor: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
      return {
        scope: "BOQ",
        currency: "EGP",
        boqTotal: formatMoneyMajor(items.reduce((sum, item) => sum + item.lineTotalMinor, 0)),
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          section: item.section,
          description: item.description,
          unit: item.unit,
          quantity: formatQuantityMajor(item.quantityMilli),
          unitRate: formatMoneyMajor(item.unitRateMinor),
          lineTotal: formatMoneyMajor(item.lineTotalMinor)
        }))
      };
    }
    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT" && user.role !== "CLIENT") return null;

    const [profile, boq, payments, expenses, contractors, estimate] = await Promise.all([
      this.prisma.projectFinancialProfile.findUnique({ where: { projectId } }),
      this.prisma.bOQItem.aggregate({ where: { projectId }, _sum: { lineTotalMinor: true } }),
      this.prisma.clientPayment.aggregate({
        where: { projectId, status: "ACTIVE" },
        _sum: { amountMinor: true }
      }),
      user.role === "CLIENT"
        ? Promise.resolve(null)
        : this.prisma.expense.aggregate({
            where: { projectId, status: "ACTIVE" },
            _sum: { amountMinor: true }
          }),
      user.role === "CLIENT"
        ? Promise.resolve(null)
        : this.prisma.contractorPayment.aggregate({
            where: { projectId, status: "ACTIVE" },
            _sum: { amountMinor: true }
          }),
      user.role === "CLIENT"
        ? Promise.resolve(null)
        : this.prisma.costEstimate.findFirst({
            where: { projectId, isCurrent: true },
            select: { items: { select: { lineTotalMinor: true } } }
          })
    ]);
    const contract = profile?.contractValueMinor ?? null;
    const paid = payments._sum.amountMinor ?? 0;
    const base = {
      scope: user.role === "CLIENT" ? "CLIENT_SAFE" : "FULL_KPI",
      currency: profile?.currency ?? "EGP",
      contractValue: contract === null ? null : formatMoneyMajor(contract),
      paidAmount: formatMoneyMajor(paid),
      outstandingBalance: contract === null ? null : formatMoneyMajor(contract - paid)
    };
    if (user.role === "CLIENT") return base;
    const expenseTotal = expenses?._sum.amountMinor ?? 0;
    const contractorTotal = contractors?._sum.amountMinor ?? 0;
    return {
      ...base,
      boqTotal: formatMoneyMajor(boq._sum.lineTotalMinor ?? 0),
      estimateTotal: formatMoneyMajor(
        estimate?.items.reduce((sum, item) => sum + item.lineTotalMinor, 0) ?? 0
      ),
      expensesTotal: formatMoneyMajor(expenseTotal),
      contractorPaymentsTotal: formatMoneyMajor(contractorTotal),
      committedCostTotal: formatMoneyMajor(expenseTotal + contractorTotal)
    };
  }
}

function serializeIdentity(
  project: Prisma.ProjectGetPayload<{ select: typeof projectIdentitySelect }>
) {
  return {
    ...project,
    startDate: project.startDate?.toISOString() ?? null,
    targetDate: project.targetDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}
