import { Module } from '@nestjs/common';
import { ComplianceCategoriesController } from './compliance-categories.controller';
import { ComplianceCategoriesService } from './compliance-categories.service';
@Module({
  controllers: [ComplianceCategoriesController],
  providers: [ComplianceCategoriesService],
})
export class ComplianceCategoriesModule {}
