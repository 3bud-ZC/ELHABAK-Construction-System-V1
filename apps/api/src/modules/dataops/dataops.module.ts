import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { StorageService } from "../projects/storage.service";
import { DataOpsController } from "./dataops.controller";
import { DataOpsService } from "./dataops.service";

@Module({
  imports: [AuthModule, ProjectsModule, NotificationsModule],
  controllers: [DataOpsController],
  providers: [AuditService, DataOpsService, StorageService]
})
export class DataOpsModule {}
