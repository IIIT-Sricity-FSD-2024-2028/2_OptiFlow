import { Module } from '@nestjs/common';
import { ComplianceRulesService } from './compliance-rules.service';
import { ComplianceRulesController } from './compliance-rules.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [ComplianceRulesController], providers: [ComplianceRulesService] })
export class ComplianceRulesModule {}
