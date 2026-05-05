import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';

@ApiTags('Workflow Templates')
@Controller('workflow-templates')
@UseGuards(RolesGuard)
export class WorkflowTemplatesController {
  constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

  @Get()
  findAll() {
    return this.workflowTemplatesService.findAll();
  }
}
