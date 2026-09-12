import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { PdfService } from "./pdf.service";
import { ReportsService } from "./reports.service";

@UseGuards(AuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly pdf: PdfService
  ) {}

  @Get("projects")
  listProjects(@CurrentUser() user: RequestUser, @Query("search") search?: string) {
    return this.reports.listProjects(user, search);
  }

  @Get("projects/:id")
  getProjectReport(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.reports.getProjectReport(user, id);
  }

  @Get("projects/:id/pdf")
  @Header("Cache-Control", "private, no-store")
  async exportProjectReport(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Query("lang") rawLanguage: string | undefined,
    @Res() response: Response
  ) {
    if (rawLanguage !== "ar" && rawLanguage !== "en")
      throw new BadRequestException("Report language must be ar or en.");
    const report = await this.reports.getProjectReport(user, id);
    const buffer = await this.pdf.render(report, rawLanguage);
    const code = report.project.code?.replace(/[^a-zA-Z0-9_-]/g, "-") || report.project.id;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Length", String(buffer.length));
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="ELHABAK-${code}-${rawLanguage}.pdf"`
    );
    response.send(buffer);
  }
}
