import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserRole } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanRead(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN") {
      return;
    }

    const allowed = await this.canRead(user, projectId);
    if (!allowed.exists) {
      throw new NotFoundException("Project not found.");
    }
    if (!allowed.canAccess) {
      throw new ForbiddenException("Project access denied.");
    }
  }

  async assertWorkerCanUpdate(user: RequestUser, projectId: string) {
    if (user.role === "ADMIN") {
      return;
    }
    if (user.role !== "WORKER" && user.role !== "ENGINEER") {
      throw new ForbiddenException("Project update access denied.");
    }

    const assignment = await this.prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      include: { user: true }
    });

    if (!assignment) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!project) {
        throw new NotFoundException("Project not found.");
      }
      throw new ForbiddenException("Project update access denied.");
    }
  }

  projectWhereFor(user: RequestUser) {
    if (user.role === "ADMIN") {
      return {};
    }

    if (user.role === "CLIENT") {
      return { client: { userId: user.id } };
    }

    if (user.role === "ENGINEER" || user.role === "WORKER" || user.role === "ACCOUNTANT") {
      return { OR: [{ engineerId: user.id }, { assignments: { some: { userId: user.id } } }] };
    }

    return { id: "__never__" };
  }

  private async canRead(user: RequestUser, projectId: string): Promise<{ exists: boolean; canAccess: boolean }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        engineerId: true,
        client: { select: { userId: true } },
        assignments: { where: { userId: user.id }, select: { userId: true } }
      }
    });

    if (!project) {
      return { exists: false, canAccess: false };
    }

    const role: UserRole = user.role;
    if (role === "CLIENT") {
      return { exists: true, canAccess: project.client?.userId === user.id };
    }
    if (role === "ENGINEER" || role === "WORKER" || role === "ACCOUNTANT") {
      return { exists: true, canAccess: project.engineerId === user.id || project.assignments.length > 0 };
    }

    return { exists: true, canAccess: false };
  }
}
