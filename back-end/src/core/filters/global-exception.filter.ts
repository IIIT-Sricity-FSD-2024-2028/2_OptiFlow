import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage: unknown = 'Internal server error';
    let logMessage = 'Internal server error';
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: unknown = exception.getResponse();

      if (typeof res === 'string') {
        clientMessage = res;
        logMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        const rawMsg = resObj.message || resObj.error || exception.message;
        clientMessage = rawMsg;
        if (Array.isArray(rawMsg)) {
          logMessage = rawMsg.map((m) => String(m)).join(', ');
        } else if (typeof rawMsg === 'string') {
          logMessage = rawMsg;
        } else if (typeof rawMsg === 'number' || typeof rawMsg === 'boolean') {
          logMessage = String(rawMsg);
        } else if (typeof rawMsg === 'object' && rawMsg !== null) {
          logMessage = JSON.stringify(rawMsg);
        } else {
          logMessage = '';
        }
      } else {
        clientMessage = exception.message;
        logMessage = exception.message;
      }

      if (Number(status) >= 500) {
        stack = exception.stack;
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
          clientMessage = 'Internal server error';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      stack = exception.stack;
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = Array.isArray(exception.meta?.target)
            ? (exception.meta.target as string[]).join(', ')
            : 'field';
          clientMessage = `Unique constraint violation: record with this ${target} already exists`;
          logMessage = `Prisma P2002 Unique constraint failed on target: ${target}`;
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          clientMessage = 'Requested record was not found';
          const cause =
            typeof exception.meta?.cause === 'string'
              ? exception.meta.cause
              : exception.message;
          logMessage = `Prisma P2025 Record not found: ${cause}`;
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = 'Foreign key constraint violation';
          logMessage = `Prisma P2003 Foreign key constraint failed: ${exception.message}`;
          break;
        }
        case 'P2000': {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = 'Input value too long for database field';
          logMessage = `Prisma P2000 Value too long: ${exception.message}`;
          break;
        }
        default: {
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          clientMessage = 'Internal server error';
          logMessage = `Prisma error [${exception.code}]: ${exception.message}`;
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      clientMessage = 'Invalid database query parameters';
      logMessage = `PrismaClientValidationError: ${exception.message}`;
      stack = exception.stack;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      clientMessage = 'Internal server error';
      logMessage = exception.message;
      stack = exception.stack;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      clientMessage = 'Internal server error';
      logMessage = String(exception);
    }

    const requestPath = request.originalUrl || request.url || '/';
    const method = request.method || 'GET';

    // Log all 4xx and 5xx errors to daily error log
    if (Number(status) >= 400) {
      void this.loggingService.logError(
        method,
        requestPath,
        status,
        logMessage,
        Number(status) >= 500 ? stack : undefined,
      );
    }

    // Return safe standardized JSON error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: requestPath,
      message: clientMessage,
    });
  }
}
