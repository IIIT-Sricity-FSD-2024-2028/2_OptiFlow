import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ComplianceRulesService } from './compliance-rules.service';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Compliance Rules')
@Controller('compliance-rules')
@UseGuards(RolesGuard)
export class ComplianceRulesController {
  constructor(private readonly complianceRulesService: ComplianceRulesService) {}

  @Get()
  @Roles('superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all compliance rules' })
  findAll() { return this.complianceRulesService.findAll(); }

  @Get(':id')
  @Roles('superuser', 'compliance_officer', 'project_manager')
  @ApiOperation({ summary: 'Get a compliance rule by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.complianceRulesService.findOne(id); }

  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance rule' })
  create(@Body() dto: CreateComplianceRuleDto) { return this.complianceRulesService.create(dto); }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Update a compliance rule' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComplianceRuleDto) { return this.complianceRulesService.update(id, dto); }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a compliance rule' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.complianceRulesService.remove(id); }
}
