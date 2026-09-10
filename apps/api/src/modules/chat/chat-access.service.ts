import { ForbiddenException, Injectable } from "@nestjs/common";
import type { RequestUser } from "../../shared/http.types";
import { ProjectAccessService } from "../projects/project-access.service";

/**
 * One shared project chat thread, no sub-channels. Admin (all projects), assigned Engineer,
 * assigned Worker, and the owning Client can read and post; Accountant has no chat access
 * for this milestone, matching the approved scope.
 */
@Injectable()
export class ChatAccessService {
  constructor(private readonly projects: ProjectAccessService) {}

  async assertCanAccess(user: RequestUser, projectId: string) {
    if (user.role === "ACCOUNTANT") {
      throw new ForbiddenException("Project chat access denied.");
    }
    await this.projects.assertCanRead(user, projectId);
  }
}
