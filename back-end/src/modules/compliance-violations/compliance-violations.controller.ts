import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ComplianceViolationsService } from './compliance-violations.service';
import { CreateComplianceViolationDto } from './dto/create-compliance-violation.dto';
import { UpdateComplianceViolationDto } from './dto/update-compliance-violation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Compliance Violations')
@Controller('compliance-violations')
@UseGuards(RolesGuard)
export class ComplianceViolationsController {
  constructor(
    private readonly complianceViolationsService: ComplianceViolationsService,
  ) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'company_owner',
    'Company Owner',
    'Branch Manager',
    'branch_manager',
    'compliance_officer',
    'project_manager',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get all compliance violations' })
  findAll(
    @CompanyId() companyId: string,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.complianceViolationsService.findAll({
      companyId,
      branchId,
      user: req.user,
    });
  }

  @Get(':id')
  @Roles(
    'guest',
    'superuser',
    'compliance_officer',
    'project_manager',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get a violation by ID' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.complianceViolationsService.findOne(id, companyId);
  }

  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance violation' })
  create(
    @Body() dto: CreateComplianceViolationDto,
    @CompanyId() companyId: string,
  ) {
    return this.complianceViolationsService.create(dto);
  }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer', 'project_manager')
  @ApiOperation({ summary: 'Update a compliance violation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceViolationDto,
    @CompanyId() companyId: string,
  ) {
    return this.complianceViolationsService.update(id, dto, companyId);
  }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a compliance violation' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.complianceViolationsService.remove(id, companyId);
  }
}
