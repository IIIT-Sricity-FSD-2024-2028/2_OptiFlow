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
} from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import {
  ActorUserId,
  RequestUserRole,
} from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Subtasks')
@Controller('subtasks')
@UseGuards(RolesGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  @Roles(
    'superuser',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all subtasks' })
  findAll(@CompanyId() companyId: string) {
    return this.subtasksService.findAll(companyId);
  }

  @Get('by-task/:taskId')
  @Roles(
    'superuser',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get subtasks for a task' })
  findByTask(@Param('taskId') taskId: string, @CompanyId() companyId: string) {
    return this.subtasksService.findByTask(taskId);
  }

  @Get(':id')
  @Roles(
    'superuser',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a subtask by ID' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.subtasksService.findOne(id);
  }

  @Post()
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Create a subtask' })
  @ApiHeader({ name: 'x-user-id', required: true })
  create(
    @Body() dto: CreateSubtaskDto,
    @ActorUserId() actorUserId: any,
    @RequestUserRole() actorRole: string,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.subtasksService.create(
      dto,
      String(actorUserId),
      actorRole,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('team_member', 'team_leader')
  @ApiOperation({ summary: 'Update a subtask' })
  @ApiHeader({ name: 'x-user-id', required: true })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
    @ActorUserId() actorUserId: any,
    @RequestUserRole() actorRole: string,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.subtasksService.update(
      id,
      dto,
      String(actorUserId),
      actorRole,
      req.user,
    );
  }

  @Delete(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Delete a subtask' })
  @ApiHeader({ name: 'x-user-id', required: true })
  remove(
    @Param('id') id: string,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    return this.subtasksService.remove(id, String(actorUserId));
  }
}
