import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService?: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          message = (resObj.message as unknown[]).map(String).join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
      stack = exception.stack;
    } else if (typeof exception === 'string') {
      message = exception;
    }

    const timestamp = new Date().toISOString();
    const path = request.originalUrl || request.url || '';
    const method = request.method || 'GET';

    // Log to error log if 4xx or 5xx
    if (status >= 400 && this.loggingService) {
      void this.loggingService.logError({
        timestamp,
        method,
        path,
        statusCode: status,
        message,
        stack: status >= 500 ? stack : undefined,
      });
    }

    // Return clean response without internal stack traces
    response.status(status).json({
      statusCode: status,
      timestamp,
      path,
      message,
    });
  }
}
