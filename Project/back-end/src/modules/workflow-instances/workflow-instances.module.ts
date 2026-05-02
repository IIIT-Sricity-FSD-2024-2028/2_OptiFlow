import { Module } from '@nestjs/common';
import { WorkflowInstancesService } from './workflow-instances.service';
import { WorkflowInstancesController } from './workflow-instances.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowInstancesController],
  providers: [WorkflowInstancesService],
})
export class WorkflowInstancesModule {}
