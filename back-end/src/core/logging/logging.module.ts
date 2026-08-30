import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LoggerMiddleware } from '../middleware/logger.middleware';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

@Global()
@Module({
  providers: [
    LoggingService,
    LoggerMiddleware,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [LoggingService, LoggerMiddleware],
})
export class LoggingModule {}
