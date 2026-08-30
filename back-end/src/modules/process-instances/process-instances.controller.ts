import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProcessInstancesService } from './process-instances.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process-instance.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Process Instances')
@Controller('process-instances')
@UseGuards(RolesGuard)
export class ProcessInstancesController {
  constructor(private readonly svc: ProcessInstancesService) {}
  @Get()
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member', 'compliance_officer')
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOperation({ summary: 'List process instances' })
  findAll(
    @CompanyId() companyId: string,
    @Query('templateId') templateId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.findAll(companyId, templateId, projectId);
  }
  @Get(':id')
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member', 'compliance_officer')
  @ApiOperation({ summary: 'Get a process instance' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id, companyId);
  }
  @Post()
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Create a process instance' })
  create(
    @Body() dto: CreateProcessInstanceDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
  ) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Update a process instance' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessInstanceDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto, companyId);
  }
  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a process instance' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id, companyId);
  }
}
