import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProcessTemplatesService } from './process-templates.service';
import { CreateProcessTemplateDto } from './dto/create-process-template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process-template.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Process Templates')
@Controller('process-templates')
@UseGuards(RolesGuard)
export class ProcessTemplatesController {
  constructor(private readonly svc: ProcessTemplatesService) {}
  @Get()
  @Roles(
    'superuser',
    'process_admin',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'List process templates' })
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }
  @Get(':id')
  @Roles(
    'superuser',
    'process_admin',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a process template' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id, companyId);
  }
  @Post()
  @Roles('superuser', 'process_admin', 'project_manager')
  @ApiOperation({ summary: 'Create a process template' })
  create(
    @Body() dto: CreateProcessTemplateDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
  ) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('superuser', 'process_admin', 'project_manager')
  @ApiOperation({ summary: 'Update a process template' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessTemplateDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto, companyId);
  }
  @Delete(':id')
  @Roles('superuser', 'process_admin')
  @ApiOperation({ summary: 'Delete a process template' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id, companyId);
  }
}
