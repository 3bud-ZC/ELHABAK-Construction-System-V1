import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { StorageService } from "../projects/storage.service";
import { DesignAccessService } from "./design-access.service";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";

@Module({
  imports: [AuthModule, ProjectsModule, NotificationsModule],
  controllers: [DesignsController],
  providers: [AuditService, StorageService, DesignAccessService, DesignsService]
})
export class DesignsModule {}
