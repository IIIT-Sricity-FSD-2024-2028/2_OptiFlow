import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Escalations')
@Controller('escalations')
@UseGuards(RolesGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all escalations' })
  findAll() {
    return this.escalationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an escalation by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.escalationsService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Create a new escalation' })
  create(@Body() createEscalationDto: CreateEscalationDto) {
    return this.escalationsService.create(createEscalationDto);
  }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'team_leader')
  @ApiOperation({ summary: 'Update an escalation' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEscalationDto: UpdateEscalationDto) {
    return this.escalationsService.update(id, updateEscalationDto);
  }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete an escalation' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.escalationsService.remove(id);
  }
}
