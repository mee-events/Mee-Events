import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainError } from "../errors/domain.error";
import { requestIdForError } from "./request-context";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = requestIdForError(request);

    if (exception instanceof DomainError) {
      response.status(exception.status).json({
        code: exception.code,
        message: exception.message,
        status: exception.status,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        code: "HTTP_REQUEST_FAILED",
        message:
          status >= 500 ? "An unexpected error occurred" : exception.message,
        status,
        requestId,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      requestId,
    });
  }
}
