import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get a role by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.rolesService.findOne(id); }

  @Post()
  @Roles('superuser')
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto) { return this.rolesService.create(dto); }

  @Patch(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Update a role' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) { return this.rolesService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a role' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.rolesService.remove(id); }
}
