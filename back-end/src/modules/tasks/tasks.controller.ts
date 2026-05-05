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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ActorUserId, RequestUserRole } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('assignee/:userId')
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get tasks assigned to a specific user' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findByAssignee(@Param('userId', ParseIntPipe) userId: number) {
    return this.tasksService.findByAssignee(userId);
  }

  @Get(':id')
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a task by ID (includes subtasks and active escalations)' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  create(@Body() createTaskDto: CreateTaskDto, @ActorUserId() actorUserId: number) {
    return this.tasksService.create(createTaskDto, actorUserId);
  }

  @Patch(':id')
  @Roles('team_member', 'team_leader', 'project_manager')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @ActorUserId() actorUserId: number,
    @RequestUserRole() actorRole: string,
  ) {
    return this.tasksService.update(id, updateTaskDto, actorUserId, actorRole);
  }

  @Delete(':id')
  @Roles('project_manager', 'team_leader')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  remove(@Param('id', ParseIntPipe) id: number, @ActorUserId() actorUserId: number) {
    return this.tasksService.remove(id, actorUserId);
  }
}
