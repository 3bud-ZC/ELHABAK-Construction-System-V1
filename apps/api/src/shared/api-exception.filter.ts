import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { MulterError } from "multer";
import type { Response } from "express";

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ url?: string; method?: string; requestId?: string }>();

    let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let multerMessage: string | undefined;

    if (exception instanceof MulterError) {
      // Multer throws before Nest pipes/controllers run - e.g. LIMIT_FILE_SIZE from the
      // upload ceiling, or LIMIT_UNEXPECTED_FILE for a wrong field name.
      status =
        exception.code === "LIMIT_FILE_SIZE" ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
      multerMessage =
        exception.code === "LIMIT_FILE_SIZE" ? "File is too large." : "Invalid file upload.";
    }

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      multerMessage ??
      (typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : status === 500
          ? "Internal server error"
          : "Request failed");

    if (status >= 500) {
      this.logger.error(
        `${request.method ?? "?"} ${request.url ?? "?"} -> ${status} (requestId=${request.requestId ?? "n/a"})`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error: HttpStatus[status] ?? "Error",
      message,
      timestamp: new Date().toISOString(),
      path: request.url ?? "",
      ...(request.requestId ? { requestId: request.requestId } : {})
    };

    response.status(status).json(body);
  }
}
