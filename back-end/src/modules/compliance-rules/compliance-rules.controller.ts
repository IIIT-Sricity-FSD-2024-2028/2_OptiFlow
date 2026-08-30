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
import { ComplianceRulesService } from './compliance-rules.service';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Compliance Rules')
@Controller('compliance-rules')
@UseGuards(RolesGuard)
export class ComplianceRulesController {
  constructor(
    private readonly complianceRulesService: ComplianceRulesService,
  ) {}

  @Get()
  @Roles(
    'superuser',
    'compliance_officer',
    'project_manager',
    'team_leader',
    'team_member',
    'hr_manager',
  )
  @ApiOperation({ summary: 'Get all compliance rules' })
  findAll(@CompanyId() companyId: string) {
    return this.complianceRulesService.findAll(companyId);
  }

  @Get(':id')
  @Roles('superuser', 'compliance_officer', 'project_manager')
  @ApiOperation({ summary: 'Get a compliance rule by ID' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.complianceRulesService.findOne(id, companyId);
  }

  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance rule' })
  create(@Body() dto: CreateComplianceRuleDto, @CompanyId() companyId: string) {
    return this.complianceRulesService.create(dto, companyId);
  }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Update a compliance rule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceRuleDto,
    @CompanyId() companyId: string,
  ) {
    return this.complianceRulesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a compliance rule' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.complianceRulesService.remove(id, companyId);
  }
}
