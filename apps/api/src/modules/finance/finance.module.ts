import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { StorageService } from "../projects/storage.service";
import { FinanceAccessService } from "./finance-access.service";
import { FinanceController, FinancePortfolioController, FinanceProjectsController } from "./finance.controller";
import { FinancePortfolioService } from "./finance-portfolio.service";
import { FinanceService } from "./finance.service";
import { PdfService } from "../reports/pdf.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [FinanceController, FinanceProjectsController, FinancePortfolioController],
  providers: [AuditService, StorageService, FinanceAccessService, FinanceService, FinancePortfolioService, PdfService]
})
export class FinanceModule {}
