import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Escalations')
@Controller('escalations')
@UseGuards(RolesGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all escalations' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findAll() {
    return this.escalationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an escalation by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.escalationsService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Create a new escalation' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  create(@Body() createEscalationDto: CreateEscalationDto) {
    return this.escalationsService.create(createEscalationDto);
  }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'team_leader')
  @ApiOperation({ summary: 'Update an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEscalationDto: UpdateEscalationDto) {
    return this.escalationsService.update(id, updateEscalationDto);
  }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.escalationsService.remove(id);
  }
}
