import { Module } from '@nestjs/common';
import { WorkflowInstanceStepsService } from './workflow-instance-steps.service';
import { WorkflowInstanceStepsController } from './workflow-instance-steps.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowInstanceStepsController],
  providers: [WorkflowInstanceStepsService],
})
export class WorkflowInstanceStepsModule {}
