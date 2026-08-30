import { Module } from '@nestjs/common';
import { ProcessInstancesController } from './process-instances.controller';
import { ProcessInstancesService } from './process-instances.service';
@Module({
  controllers: [ProcessInstancesController],
  providers: [ProcessInstancesService],
})
export class ProcessInstancesModule {}
