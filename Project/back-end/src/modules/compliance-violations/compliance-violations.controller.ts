import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ComplianceViolationsService } from './compliance-violations.service';
import { CreateComplianceViolationDto } from './dto/create-compliance-violation.dto';
import { UpdateComplianceViolationDto } from './dto/update-compliance-violation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Compliance Violations')
@Controller('compliance-violations')
@UseGuards(RolesGuard)
export class ComplianceViolationsController {
  constructor(private readonly complianceViolationsService: ComplianceViolationsService) {}

  @Get()
  @Roles('guest', 'superuser', 'compliance_officer', 'project_manager', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all compliance violations' })
  findAll() { return this.complianceViolationsService.findAll(); }

  @Get(':id')
  @Roles('guest', 'superuser', 'compliance_officer', 'project_manager', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get a violation by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.complianceViolationsService.findOne(id); }

  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance violation' })
  create(@Body() dto: CreateComplianceViolationDto) { return this.complianceViolationsService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Update a compliance violation' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComplianceViolationDto) { return this.complianceViolationsService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a compliance violation' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.complianceViolationsService.remove(id); }
}
