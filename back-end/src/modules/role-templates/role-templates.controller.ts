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
import { RoleTemplatesService } from './role-templates.service';
import { CreateRoleTemplateDto } from './dto/create-role-template.dto';
import { UpdateRoleTemplateDto } from './dto/update-role-template.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Role Templates')
@Controller('role-templates')
@UseGuards(RolesGuard)
export class RoleTemplatesController {
  constructor(private readonly svc: RoleTemplatesService) {}
  @Get()
  @Roles(
    'platform_admin',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'List role templates' })
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }
  @Get(':id')
  @Roles(
    'platform_admin',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a role template' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }
  @Post()
  @Roles('platform_admin', 'superuser')
  @ApiOperation({ summary: 'Create a role template' })
  create(@Body() dto: CreateRoleTemplateDto, @CompanyId() companyId: string) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('platform_admin', 'superuser')
  @ApiOperation({ summary: 'Update a role template' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleTemplateDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto);
  }
  @Delete(':id')
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Delete a role template' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id);
  }
}
