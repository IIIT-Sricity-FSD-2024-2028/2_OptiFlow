import { Module } from '@nestjs/common';
import { ComplianceViolationsService } from './compliance-violations.service';
import { ComplianceViolationsController } from './compliance-violations.controller';
import { ComplianceObserverService } from './compliance-observer.service';

@Module({
  controllers: [ComplianceViolationsController],
  providers: [ComplianceViolationsService, ComplianceObserverService],
})
export class ComplianceViolationsModule {}
