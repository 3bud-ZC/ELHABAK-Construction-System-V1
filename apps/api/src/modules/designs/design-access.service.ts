import { ForbiddenException, Injectable } from "@nestjs/common";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

@Injectable()
export class DesignAccessService {
  constructor(private readonly projects: ProjectAccessService) {}

  async assertCanRead(user: RequestUser, projectId: string) {
    if (!(["ADMIN", "ENGINEER", "CLIENT"] as const).includes(user.role as "ADMIN" | "ENGINEER" | "CLIENT")) {
      throw new ForbiddenException("Design access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }

  async assertCanManage(user: RequestUser, projectId: string) {
    if (user.role !== "ADMIN" && user.role !== "ENGINEER") {
      throw new ForbiddenException("Design management access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }

  async assertCanReview(user: RequestUser, projectId: string) {
    if (user.role !== "CLIENT") {
      throw new ForbiddenException("Client review access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }
}
