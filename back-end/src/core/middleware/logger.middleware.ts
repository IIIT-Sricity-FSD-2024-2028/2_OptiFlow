import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const method = req.method;
    const path = req.originalUrl || req.url;

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      let level: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
      if (statusCode >= 500) {
        level = 'ERROR';
      } else if (statusCode >= 400) {
        level = 'WARN';
      }

      void this.loggingService.logRequest({
        timestamp: new Date().toISOString(),
        level,
        method,
        path,
        statusCode,
        durationMs,
      });
    });

    next();
  }
}
