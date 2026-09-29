import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminProjectsController } from "./admin-projects.controller";
import { ExecutionController } from "./execution.controller";
import { ExecutionService } from "./execution.service";
import { ProjectAccessService } from "./project-access.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { StorageService } from "./storage.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AdminProjectsController, ProjectsController, ExecutionController],
  providers: [AuditService, ProjectAccessService, ProjectsService, ExecutionService, StorageService],
  exports: [ProjectsService, ProjectAccessService]
})
export class ProjectsModule {}
