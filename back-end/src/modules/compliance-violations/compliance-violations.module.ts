import { Module } from '@nestjs/common';
import { ComplianceViolationsService } from './compliance-violations.service';
import { ComplianceViolationsController } from './compliance-violations.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [ComplianceViolationsController], providers: [ComplianceViolationsService] })
export class ComplianceViolationsModule {}
