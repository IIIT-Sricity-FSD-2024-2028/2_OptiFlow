import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all departments' })
  findAll() { return this.departmentsService.findAll(); }

  @Get(':id')
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a department by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.departmentsService.findOne(id); }

  @Post()
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto) { return this.departmentsService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) { return this.departmentsService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a department' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.departmentsService.remove(id); }
}
