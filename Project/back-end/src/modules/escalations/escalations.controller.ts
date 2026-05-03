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
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Escalations')
@Controller('escalations')
@UseGuards(RolesGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Get()
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all escalations' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findAll() {
    return this.escalationsService.findAll();
  }

  @Get(':id')
  @Roles('project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get an escalation by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.escalationsService.findOne(id);
  }

  @Post()
  @Roles('team_member', 'team_leader')
  @ApiOperation({ summary: 'Create a new escalation' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  create(@Body() createEscalationDto: CreateEscalationDto, @ActorUserId() actorUserId: number) {
    return this.escalationsService.create(createEscalationDto, actorUserId);
  }

  @Patch(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Update an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEscalationDto: UpdateEscalationDto,
    @ActorUserId() actorUserId: number,
  ) {
    return this.escalationsService.update(id, updateEscalationDto, actorUserId);
  }

  @Delete(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Delete an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor user id (integer)' })
  remove(@Param('id', ParseIntPipe) id: number, @ActorUserId() actorUserId: number) {
    return this.escalationsService.remove(id, actorUserId);
  }
}
