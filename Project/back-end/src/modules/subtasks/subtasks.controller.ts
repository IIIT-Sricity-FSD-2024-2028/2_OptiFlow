import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Subtasks')
@Controller('subtasks')
@UseGuards(RolesGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  @Roles('guest', 'superuser', 'project_manager', 'compliance_officer', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all subtasks' })
  findAll() { return this.subtasksService.findAll(); }

  @Get('by-task/:taskId')
  @Roles('guest', 'superuser', 'project_manager', 'compliance_officer', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get subtasks for a task' })
  findByTask(@Param('taskId', ParseIntPipe) taskId: number) { return this.subtasksService.findByTask(taskId); }

  @Get(':id')
  @Roles('guest', 'superuser', 'project_manager', 'compliance_officer', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a subtask by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.subtasksService.findOne(id); }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader')
  @ApiOperation({ summary: 'Create a subtask' })
  create(@Body() dto: CreateSubtaskDto) { return this.subtasksService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Update a subtask' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubtaskDto) { return this.subtasksService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'project_manager', 'team_leader')
  @ApiOperation({ summary: 'Delete a subtask' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.subtasksService.remove(id); }
}
