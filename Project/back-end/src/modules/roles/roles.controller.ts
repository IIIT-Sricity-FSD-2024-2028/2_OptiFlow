import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Put } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all roles' })
  findAll() { return this.rolesService.findAll(); }

  @Get(':id')
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a role by ID or Slug' })
  findOne(@Param('id') id: string) { return this.rolesService.findOne(id); }

  @Post()
  @Roles('superuser')
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto) { return this.rolesService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Update a role' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) { return this.rolesService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Delete a role' })
  remove(@Param('id') id: string) { return this.rolesService.remove(id); }

  @Get('overrides/:id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Get employee overrides' })
  getOverrides(@Param('id') id: string) {
    return this.rolesService.getOverrides(parseInt(id, 10));
  }

  @Put('overrides/:id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Set employee overrides' })
  setOverrides(@Param('id') id: string, @Body() body: { permissions: Record<string, boolean> }) {
    return this.rolesService.setOverrides(parseInt(id, 10), body.permissions);
  }

  @Delete('overrides/:id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Delete employee overrides' })
  deleteOverrides(@Param('id') id: string) {
    return this.rolesService.deleteOverrides(parseInt(id, 10));
  }

  @Post('reset')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Reset all roles to default' })
  resetRoles() {
    return this.rolesService.resetRoles();
  }
}
