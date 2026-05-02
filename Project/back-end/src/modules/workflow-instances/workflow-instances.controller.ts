import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkflowInstancesService } from './workflow-instances.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';

@ApiTags('Workflow Instances')
@Controller('workflow-instances')
@UseGuards(RolesGuard)
export class WorkflowInstancesController {
  constructor(private readonly workflowInstancesService: WorkflowInstancesService) {}

  @Get()
  @ApiHeader({ name: 'x-user-role', required: true })
  findAll() {
    return this.workflowInstancesService.findAll();
  }
}
