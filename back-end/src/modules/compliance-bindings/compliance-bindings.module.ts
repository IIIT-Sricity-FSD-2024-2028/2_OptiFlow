import { Module } from '@nestjs/common';
import { ComplianceBindingsController } from './compliance-bindings.controller';
import { ComplianceBindingsService } from './compliance-bindings.service';
@Module({
  controllers: [ComplianceBindingsController],
  providers: [ComplianceBindingsService],
})
export class ComplianceBindingsModule {}
