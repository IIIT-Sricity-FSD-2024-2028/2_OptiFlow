import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all teams' })
  findAll() { return this.teamsService.findAll(); }

  @Get(':id')
  @Roles('guest', 'superuser', 'hr_manager', 'project_manager', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a team by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.teamsService.findOne(id); }

  @Post()
  @Roles('superuser', 'hr_manager', 'project_manager')
  @ApiOperation({ summary: 'Create a team' })
  create(@Body() dto: CreateTeamDto) { return this.teamsService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'hr_manager', 'project_manager')
  @ApiOperation({ summary: 'Update a team' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamDto) { return this.teamsService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Delete a team' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.teamsService.remove(id); }
}
