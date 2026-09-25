import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";

/**
 * Finance is a company-wide accounting function: unlike Engineer/Worker project
 * assignment, Admin and Accountant get finance access to every project (they are not
 * tracked via ProjectAssignment). All other roles are denied finance access entirely.
 */
@Injectable()
export class FinanceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full internal finance management: create/edit/void records, set contract value, view audit history. */
  async assertCanManage(user: RequestUser, projectId: string) {
    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      throw new ForbiddenException("Finance management access denied.");
    }
    await this.assertProjectExists(projectId);
  }

  /** Finance is restricted to internal financial operators only. */
  async assertCanViewBoq(user: RequestUser, projectId: string) {
    await this.assertCanManage(user, projectId);
  }

  async assertCanViewClientSummary(user: RequestUser, projectId: string) {
    await this.assertCanManage(user, projectId);
  }

  async assertCanViewAny(user: RequestUser, projectId: string) {
    await this.assertCanManage(user, projectId);
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
  }
}
