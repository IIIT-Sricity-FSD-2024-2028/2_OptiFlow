import { Module } from '@nestjs/common';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}
