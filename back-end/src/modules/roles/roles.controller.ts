import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'compliance_officer',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get all roles for the company' })
  findAll(@CompanyId() companyId: string) {
    return this.rolesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'compliance_officer',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get a role by ID or label' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.rolesService.findOne(id, companyId);
  }

  @Post()
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto, @CompanyId() companyId: string) {
    return this.rolesService.create(dto, companyId);
  }

  @Patch(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Update a role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CompanyId() companyId: string,
  ) {
    return this.rolesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Delete a role' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.rolesService.remove(id, companyId);
  }
}
