import {
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
import { memoryStorage } from "multer";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { StorageService } from "../projects/storage.service";
import { FinanceService } from "./finance.service";

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
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
  createExpense(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createExpense(user, projectId, body, file);
  }

  @Patch("expenses/:expenseId")
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
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
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
  createClientPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createClientPayment(user, projectId, body, file);
  }

  @Patch("client-payments/:paymentId")
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
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
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
  createContractorPayment(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.finance.createContractorPayment(user, projectId, body, file);
  }

  @Patch("contractor-payments/:paymentId")
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage() }))
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
