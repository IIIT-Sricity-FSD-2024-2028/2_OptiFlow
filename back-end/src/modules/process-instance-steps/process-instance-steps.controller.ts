import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProcessInstanceStepsService } from './process-instance-steps.service';
import { CreateProcessInstanceStepDto } from './dto/create-process-instance-step.dto';
import { UpdateProcessInstanceStepDto } from './dto/update-process-instance-step.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Process Instance Steps')
@Controller('process-instance-steps')
@UseGuards(RolesGuard)
export class ProcessInstanceStepsController {
  constructor(private readonly svc: ProcessInstanceStepsService) {}
  @Get()
  @Roles(
    'superuser',
    'process_admin',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiQuery({ name: 'processInstanceId', required: false })
  @ApiOperation({ summary: 'List steps' })
  findAll(
    @CompanyId() companyId: string,
    @Query('processInstanceId') processInstanceId?: string,
  ) {
    return this.svc.findAll(processInstanceId);
  }
  @Get(':id')
  @Roles(
    'superuser',
    'process_admin',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a step' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }
  @Post()
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Create a step' })
  create(
    @Body() dto: CreateProcessInstanceStepDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.create(dto);
  }
  @Patch(':id')
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Update step status (action)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessInstanceStepDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
  ) {
    return this.svc.update(id, dto);
  }
}
