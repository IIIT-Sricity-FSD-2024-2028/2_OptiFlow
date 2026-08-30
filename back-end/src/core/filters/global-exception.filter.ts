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
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: unknown = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = resObj.message || resObj.error || exception.message;
      } else {
        message = exception.message;
      }

      if (Number(status) >= 500) {
        stack = exception.stack;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    } else {
      message = String(exception);
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const formattedMessage = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'object' && message !== null
        ? JSON.stringify(message)
        : String(message);

    // Write to error log for 4xx and 5xx
    if (Number(status) >= 400) {
      const requestPath = request.originalUrl || request.url || '/';
      const method = request.method || 'GET';
      void this.loggingService.logError(
        method,
        requestPath,
        status,
        formattedMessage,
        Number(status) >= 500 ? stack : undefined,
      );
    }

    // Return safe JSON response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url || '/',
      message: formattedMessage,
    });
  }
}
