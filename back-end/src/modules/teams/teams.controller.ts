import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'compliance_officer',
    'team_leader',
    'team_member',
    'System Admin',
  )
  @ApiOperation({ summary: 'Get all teams' })
  findAll(@CompanyId() companyId: string) {
    return this.teamsService.findAll(undefined, companyId);
  }

  @Get(':id')
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'compliance_officer',
    'team_leader',
    'team_member',
    'System Admin',
  )
  @ApiOperation({ summary: 'Get a team by ID' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'hr_manager', 'project_manager', 'System Admin')
  @ApiOperation({ summary: 'Create a team' })
  create(@Body() dto: CreateTeamDto, @CompanyId() companyId: string) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  @Roles('superuser', 'hr_manager', 'project_manager', 'System Admin')
  @ApiOperation({ summary: 'Update a team' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CompanyId() companyId: string,
  ) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superuser', 'hr_manager', 'System Admin')
  @ApiOperation({ summary: 'Delete a team' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.teamsService.remove(id);
  }
}
