import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkflowInstanceStepsService } from './workflow-instance-steps.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';

@ApiTags('Workflow Instance Steps')
@Controller('workflow-instance-steps')
@UseGuards(RolesGuard)
export class WorkflowInstanceStepsController {
  constructor(private readonly workflowInstanceStepsService: WorkflowInstanceStepsService) {}

  @Get()
  findAll() {
    return this.workflowInstanceStepsService.findAll();
  }
}
