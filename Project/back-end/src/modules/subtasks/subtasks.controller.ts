import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ActorUserId, RequestUserRole } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Subtasks')
@Controller('subtasks')
@UseGuards(RolesGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all subtasks' })
  @ApiHeader({ name: 'x-user-role', required: true })
  findAll() {
    return this.subtasksService.findAll();
  }

  @Get('by-task/:taskId')
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get subtasks for a task' })
  @ApiHeader({ name: 'x-user-role', required: true })
  findByTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.subtasksService.findByTask(taskId);
  }

  @Get(':id')
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a subtask by ID' })
  @ApiHeader({ name: 'x-user-role', required: true })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subtasksService.findOne(id);
  }

  @Post()
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Create a subtask' })
  @ApiHeader({ name: 'x-user-role', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  create(@Body() dto: CreateSubtaskDto, @ActorUserId() actorUserId: number) {
    return this.subtasksService.create(dto, actorUserId);
  }

  @Patch(':id')
  @Roles('team_member', 'team_leader')
  @ApiOperation({ summary: 'Update a subtask' })
  @ApiHeader({ name: 'x-user-role', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubtaskDto,
    @ActorUserId() actorUserId: number,
    @RequestUserRole() actorRole: string,
  ) {
    return this.subtasksService.update(id, dto, actorUserId, actorRole);
  }

  @Delete(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Delete a subtask' })
  @ApiHeader({ name: 'x-user-role', required: true })
  @ApiHeader({ name: 'x-user-id', required: true })
  remove(@Param('id', ParseIntPipe) id: number, @ActorUserId() actorUserId: number) {
    return this.subtasksService.remove(id, actorUserId);
  }
}
