import { Module } from '@nestjs/common';
import { ComplianceRulesService } from './compliance-rules.service';
import { ComplianceRulesController } from './compliance-rules.controller';

@Module({
  controllers: [ComplianceRulesController],
  providers: [ComplianceRulesService],
})
export class ComplianceRulesModule {}
