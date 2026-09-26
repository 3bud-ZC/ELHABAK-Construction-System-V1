import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryUploadOptions } from "../../shared/upload";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { StorageService } from "../projects/storage.service";
import { FinanceService } from "./finance.service";
import { FinancePortfolioService } from "./finance-portfolio.service";
import { PdfService } from "../reports/pdf.service";
import { buildCsv, buildXlsx, exportFilename } from "../dataops/export-builders";

@UseGuards(AuthGuard)
@Controller("projects/:projectId/finance")
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly storage: StorageService
  ) {}

  @Get("context")
  getContext(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.finance.getProjectContext(user, projectId);
  }

  @Get("summary")
  getSummary(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.finance.getSummary(user, projectId);
  }

  @Patch("contract")
  setContractValue(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.finance.setContractValue(user, projectId, body);
  }

  @Get("history")
  getHistory(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.finance.getHistory(user, projectId);
  }

  // ---------------------------------------------------------------- Estimates

  @Get("estimates")
  listEstimates(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.finance.listEstimates(user, projectId);
  }

  @Post("estimates")
  createEstimate(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.finance.createEstimate(user, projectId, body);
  }

  @Patch("estimates/:estimateId")
  updateEstimate(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("estimateId") estimateId: string,
    @Body() body: unknown
  ) {
    return this.finance.updateEstimate(user, projectId, estimateId, body);
  }

  @Post("estimates/:estimateId/new-version")
  newEstimateVersion(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("estimateId") estimateId: string
  ) {
    return this.finance.createNewEstimateVersion(user, projectId, estimateId);
  }

  @Post("estimates/:estimateId/items")
  addEstimateItem(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("estimateId") estimateId: string,
    @Body() body: unknown
  ) {
    return this.finance.addEstimateItem(user, projectId, estimateId, body);
  }

  @Patch("estimates/:estimateId/items/:itemId")
  updateEstimateItem(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("estimateId") estimateId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown
  ) {
    return this.finance.updateEstimateItem(user, projectId, estimateId, itemId, body);
  }

  @Delete("estimates/:estimateId/items/:itemId")
  removeEstimateItem(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("estimateId") estimateId: string,
    @Param("itemId") itemId: string
  ) {
    return this.finance.removeEstimateItem(user, projectId, estimateId, itemId);
  }

  // ---------------------------------------------------------------- BOQ

  @Get("boq")
  listBoqItems(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Query("section") section?: string) {
    return this.finance.listBoqItems(user, projectId, section);
  }

  @Post("boq")
  createBoqItem(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.finance.createBoqItem(user, projectId, body);
  }

  @Patch("boq/:itemId")
  updateBoqItem(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @Body() body: unknown
  ) {
    return this.finance.updateBoqItem(user, projectId, itemId, body);
  }

  @Delete("boq/:itemId")
  removeBoqItem(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("itemId") itemId: string) {
    return this.finance.removeBoqItem(user, projectId, itemId);
  }

  // ---------------------------------------------------------------- Expenses

  @Get("expenses")
  listExpenses(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("category") category?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.finance.listExpenses(user, projectId, category, from, to);
  }

  @Post("expenses")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  createExpense(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createExpense(user, projectId, body, file);
  }

  @Patch("expenses/:expenseId")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  updateExpense(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("expenseId") expenseId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.updateExpense(user, projectId, expenseId, body, file);
  }

  @Post("expenses/:expenseId/void")
  voidExpense(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("expenseId") expenseId: string,
    @Body() body: unknown
  ) {
    return this.finance.voidExpense(user, projectId, expenseId, body);
  }

  @Get("expenses/:expenseId/attachments/:attachmentId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async getExpenseAttachment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("expenseId") expenseId: string,
    @Param("attachmentId") attachmentId: string,
    @Res() response: Response
  ) {
    const attachment = await this.finance.getExpenseAttachmentFile(user, projectId, expenseId, attachmentId);
    this.streamAttachment(attachment, response);
  }

  // ---------------------------------------------------------------- Client payments

  @Get("client-payments")
  listClientPayments(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.finance.listClientPayments(user, projectId, from, to);
  }

  @Post("client-payments")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  createClientPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createClientPayment(user, projectId, body, file);
  }

  @Patch("client-payments/:paymentId")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  updateClientPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.updateClientPayment(user, projectId, paymentId, body, file);
  }

  @Post("client-payments/:paymentId/void")
  voidClientPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Body() body: unknown
  ) {
    return this.finance.voidClientPayment(user, projectId, paymentId, body);
  }

  @Get("client-payments/:paymentId/attachments/:attachmentId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async getClientPaymentAttachment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Param("attachmentId") attachmentId: string,
    @Res() response: Response
  ) {
    const attachment = await this.finance.getClientPaymentAttachmentFile(user, projectId, paymentId, attachmentId);
    this.streamAttachment(attachment, response);
  }

  // ---------------------------------------------------------------- Contractor payments

  @Get("contractor-payments")
  listContractorPayments(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.finance.listContractorPayments(user, projectId, from, to);
  }

  @Post("contractor-payments")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  createContractorPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createContractorPayment(user, projectId, body, file);
  }

  @Patch("contractor-payments/:paymentId")
  @UseInterceptors(FileInterceptor("attachment", memoryUploadOptions))
  updateContractorPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.updateContractorPayment(user, projectId, paymentId, body, file);
  }

  @Post("contractor-payments/:paymentId/void")
  voidContractorPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Body() body: unknown
  ) {
    return this.finance.voidContractorPayment(user, projectId, paymentId, body);
  }

  @Get("contractor-payments/:paymentId/attachments/:attachmentId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async getContractorPaymentAttachment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("paymentId") paymentId: string,
    @Param("attachmentId") attachmentId: string,
    @Res() response: Response
  ) {
    const attachment = await this.finance.getContractorPaymentAttachmentFile(user, projectId, paymentId, attachmentId);
    this.streamAttachment(attachment, response);
  }

  private streamAttachment(attachment: { storagePath: string; mimeType: string; fileSize: number; originalFilename: string }, response: Response) {
    const file = this.storage.open(attachment.storagePath);
    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Length", String(attachment.fileSize));
    response.setHeader(
      "Content-Disposition",
      `inline; filename="receipt"; filename*=UTF-8''${encodeURIComponent(attachment.originalFilename)}`
    );
    file.stream.pipe(response);
  }
}

/** Company-wide project picker for the Accountant/Admin finance entry point (not assignment-scoped). */
@UseGuards(AuthGuard)
@Controller("finance/projects")
export class FinanceProjectsController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.finance.listProjectsForFinance(user);
  }
}

function projectIdList(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function sectionList(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  return raw
    .split(",")
    .map((section) => section.trim())
    .filter(Boolean);
}

/**
 * Company Finance Control Center: portfolio aggregates across all / selected / one
 * project, a normalized financial-activity ledger, and the multi-project financial
 * report builder (screen JSON, PDF, CSV/XLSX). Admin/Accountant only - enforced in
 * the service, same as every project-scoped finance endpoint.
 */
@UseGuards(AuthGuard)
@Controller("finance")
export class FinancePortfolioController {
  constructor(
    private readonly portfolio: FinancePortfolioService,
    private readonly pdf: PdfService
  ) {}

  @Get("portfolio")
  getPortfolio(
    @CurrentUser() user: RequestUser,
    @Query("projectIds") projectIds?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.portfolio.getPortfolio(user, { projectIds: projectIdList(projectIds), from, to });
  }

  @Get("portfolio/activity")
  getActivity(
    @CurrentUser() user: RequestUser,
    @Query("projectIds") projectIds?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("kind") kind?: string,
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("method") method?: string,
    @Query("vendor") vendor?: string
  ) {
    return this.portfolio.getActivity(user, {
      projectIds: projectIdList(projectIds),
      from,
      to,
      kind,
      status,
      category,
      method,
      vendor
    });
  }

  @Get("report")
  buildReport(
    @CurrentUser() user: RequestUser,
    @Query("projectIds") projectIds?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("sections") sections?: string,
    @Query("detail") detail?: string
  ) {
    return this.portfolio.buildReport(user, {
      projectIds: projectIdList(projectIds),
      from,
      to,
      sections: sectionList(sections),
      detail
    });
  }

  @Get("report/pdf")
  @Header("Cache-Control", "private, no-store")
  async reportPdf(
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
    @Query("projectIds") projectIds?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("sections") sections?: string,
    @Query("detail") detail?: string,
    @Query("lang") lang?: string
  ) {
    if (lang !== "ar" && lang !== "en") {
      throw new BadRequestException("Report language must be ar or en.");
    }
    const report = await this.portfolio.buildReport(user, {
      projectIds: projectIdList(projectIds),
      from,
      to,
      sections: sectionList(sections),
      detail
    });
    const buffer = await this.pdf.renderFinanceReport(report, lang);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Length", String(buffer.length));
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="ELHABAK-Finance-${report.scope.toLowerCase()}-${lang}.pdf"`
    );
    response.send(buffer);
  }

  @Get("report/export")
  @Header("Cache-Control", "private, no-store")
  async reportExport(
    @CurrentUser() user: RequestUser,
    @Res() response: Response,
    @Query("projectIds") projectIds?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("format") format?: string,
    @Query("dataset") dataset?: string
  ) {
    const resolvedFormat = format === "csv" ? "csv" : "xlsx";
    const resolvedIds = projectIdList(projectIds);
    const filters = { projectIds: resolvedIds, from, to };

    if (dataset === "ledger") {
      const activity = await this.portfolio.getActivity(user, { ...filters, status: "ALL" });
      const data = {
        name: "Financial Ledger",
        columns: [
          { key: "project", header: "Project" },
          { key: "kind", header: "Type" },
          { key: "date", header: "Date" },
          { key: "party", header: "Party" },
          { key: "label", header: "Description" },
          { key: "category", header: "Category" },
          { key: "method", header: "Method" },
          { key: "amount", header: "Amount" },
          { key: "currency", header: "Currency" },
          { key: "status", header: "Status" },
          { key: "reference", header: "Reference" }
        ],
        rows: activity.rows.map((row) => ({
          project: (row.project as { name?: string } | null)?.name ?? null,
          kind: row.kind as string,
          date: String(row.date).slice(0, 10),
          party: (row.party as string | null) ?? null,
          label: (row.label as string | null) ?? null,
          category: (row.category as string | null) ?? null,
          method: (row.method as string | null) ?? null,
          amount: row.amount as string,
          currency: row.currency as string,
          status: row.status as string,
          reference: (row.reference as string | null) ?? null
        }))
      };
      const body = resolvedFormat === "csv" ? buildCsv(data) : await buildXlsx(data);
      response.setHeader("Content-Type", resolvedFormat === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.setHeader("Content-Disposition", `attachment; filename="${exportFilename("finance-ledger", resolvedFormat)}"`);
      response.send(body);
      return;
    }

    const report = await this.portfolio.buildReport(user, { ...filters, sections: ["executive"], detail: "summary" });
    const totalsColumns = [
      { key: "project", header: "Project" },
      { key: "code", header: "Code" },
      { key: "status", header: "Status" },
      { key: "contractValue", header: "Contract Value" },
      { key: "clientPaymentsTotal", header: "Client Collections" },
      { key: "outstandingBalance", header: "Outstanding" },
      { key: "boqTotal", header: "BOQ Total" },
      { key: "estimateTotal", header: "Current Estimate" },
      { key: "expensesTotal", header: "Expenses" },
      { key: "contractorPaymentsTotal", header: "Contractor Payments" },
      { key: "committedCostTotal", header: "Committed Cost" },
      { key: "netCashPosition", header: "Net Cash" },
      { key: "collectionPercent", header: "Collection %" },
      { key: "costVsContractPercent", header: "Cost/Contract %" }
    ];
    const rows = report.projects.map((entry) => ({
      project: entry.project.name,
      code: entry.project.code,
      status: entry.project.status,
      ...entry.summary
    }));
    rows.push({
      project: "TOTAL",
      code: null,
      status: `${report.projectCount} project(s)`,
      ...report.totals
    });
    const body = resolvedFormat === "csv" ? buildCsv({ name: "Finance Summary", columns: totalsColumns, rows }) : await buildXlsx({ name: "Finance Summary", columns: totalsColumns, rows });
    response.setHeader("Content-Type", resolvedFormat === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${exportFilename("finance-summary", resolvedFormat)}"`);
    response.send(body);
  }
}
