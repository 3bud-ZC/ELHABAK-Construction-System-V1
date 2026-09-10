import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { StorageService } from "../projects/storage.service";
import { FinanceAccessService } from "./finance-access.service";
import { FinanceController, FinanceProjectsController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [FinanceController, FinanceProjectsController],
  providers: [AuditService, StorageService, FinanceAccessService, FinanceService]
})
export class FinanceModule {}
