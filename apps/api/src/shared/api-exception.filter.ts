import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Response } from "express";

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ url?: string }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : status === 500
          ? "Internal server error"
          : "Request failed";

    const body: ErrorBody = {
      statusCode: status,
      error: HttpStatus[status] ?? "Error",
      message,
      timestamp: new Date().toISOString(),
      path: request.url ?? ""
    };

    response.status(status).json(body);
  }
}
