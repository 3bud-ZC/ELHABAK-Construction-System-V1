import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { PdfService } from "./pdf.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [ReportsController, SearchController],
  providers: [ReportsService, SearchService, PdfService]
})
export class ReportsModule {}
