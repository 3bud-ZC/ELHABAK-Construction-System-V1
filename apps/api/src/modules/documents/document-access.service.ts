import { ForbiddenException, Injectable } from "@nestjs/common";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

/**
 * Documents is for general project records only (contracts, permits, reports,
 * correspondence, handover docs) - never Design Hub drawings, Site Operations media, or
 * Finance evidence, which keep their own dedicated access services. Least privilege:
 * Worker and Accountant get no Documents access at all, matching the milestone brief.
 */
@Injectable()
export class DocumentAccessService {
  constructor(private readonly projects: ProjectAccessService) {}

  /** Admin/Engineer (assigned) manage: create, edit metadata, upload versions, visibility, archive/restore. */
  async assertCanManage(user: RequestUser, projectId: string) {
    if (user.role !== "ADMIN" && user.role !== "ENGINEER") {
      throw new ForbiddenException("Document management access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }

  /** Admin/Engineer (assigned)/Client (own project, client-visible documents only) can read. */
  async assertCanRead(user: RequestUser, projectId: string) {
    if (!(["ADMIN", "ENGINEER", "CLIENT"] as const).includes(user.role as "ADMIN" | "ENGINEER" | "CLIENT")) {
      throw new ForbiddenException("Document access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }
}
