import { Module } from '@nestjs/common';
import { ProcessInstanceStepsController } from './process-instance-steps.controller';
import { ProcessInstanceStepsService } from './process-instance-steps.service';
@Module({
  controllers: [ProcessInstanceStepsController],
  providers: [ProcessInstanceStepsService],
})
export class ProcessInstanceStepsModule {}
