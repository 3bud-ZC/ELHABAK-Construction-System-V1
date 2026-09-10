import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

/**
 * Finance is a company-wide accounting function: unlike Engineer/Worker project
 * assignment, Admin and Accountant get finance access to every project (they are not
 * tracked via ProjectAssignment). Engineer and Client access stays scoped to their own
 * assigned/owned project via ProjectAccessService, exactly like every other module.
 */
@Injectable()
export class FinanceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectAccessService
  ) {}

  /** Full internal finance management: create/edit/void records, set contract value, view audit history. */
  async assertCanManage(user: RequestUser, projectId: string) {
    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      throw new ForbiddenException("Finance management access denied.");
    }
    await this.assertProjectExists(projectId);
  }

  /** Read-only BOQ visibility for the engineer assigned to the project's execution. */
  async assertCanViewBoq(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      await this.assertProjectExists(projectId);
      return;
    }
    if (user.role === "ENGINEER") {
      await this.projects.assertCanRead(user, projectId);
      return;
    }
    throw new ForbiddenException("Finance access denied.");
  }

  /** Client-safe financial summary and their own payment/receipt history only. */
  async assertCanViewClientSummary(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      await this.assertProjectExists(projectId);
      return;
    }
    if (user.role === "CLIENT") {
      await this.projects.assertCanRead(user, projectId);
      return;
    }
    throw new ForbiddenException("Finance access denied.");
  }

  /** True if this user has any finance visibility on this project at all (used for the lightweight project header). */
  async assertCanViewAny(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") {
      await this.assertProjectExists(projectId);
      return;
    }
    if (user.role === "ENGINEER" || user.role === "CLIENT") {
      await this.projects.assertCanRead(user, projectId);
      return;
    }
    throw new ForbiddenException("Finance access denied.");
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
  }
}
