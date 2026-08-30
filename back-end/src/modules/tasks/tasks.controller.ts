import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import {
  ActorUserId,
  RequestUserRole,
} from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles(
    'superuser',
    'company_owner',
    'Company Owner',
    'Branch Manager',
    'branch_manager',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all tasks for tenant with role filtering' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll(
    @CompanyId() companyId: string,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.tasksService.findAll({
      companyId,
      branchId,
      user: req.user,
    });
  }

  @Get('assignee/:userId')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get tasks assigned to a specific user' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findByAssignee(
    @Param('userId') userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.tasksService.findByAssignee(userId);
  }

  @Get(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({
    summary: 'Get a task by ID (includes subtasks and active escalations)',
  })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.tasksService.findOne(id, companyId);
  }

  @Post()
  @Roles('team_leader', 'project_manager', 'Branch Manager', 'branch_manager')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  create(
    @Body() createTaskDto: CreateTaskDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.tasksService.create(
      createTaskDto,
      String(actorUserId),
      req.user,
    );
  }

  @Patch(':id')
  @Roles(
    'team_member',
    'team_leader',
    'project_manager',
    'Branch Manager',
    'branch_manager',
  )
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @ActorUserId() actorUserId: any,
    @RequestUserRole() actorRole: string,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.tasksService.update(
      id,
      updateTaskDto,
      String(actorUserId),
      actorRole,
      req.user,
    );
  }

  @Delete(':id')
  @Roles('project_manager', 'team_leader', 'Branch Manager', 'branch_manager')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  remove(
    @Param('id') id: string,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.tasksService.remove(id, String(actorUserId), req.user);
  }
}
