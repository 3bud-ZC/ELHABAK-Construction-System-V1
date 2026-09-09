import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { AdminProjectsController } from "./admin-projects.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { StorageService } from "./storage.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminProjectsController, ProjectsController],
  providers: [AuditService, ProjectAccessService, ProjectsService, StorageService],
  exports: [ProjectsService, ProjectAccessService]
})
export class ProjectsModule {}
