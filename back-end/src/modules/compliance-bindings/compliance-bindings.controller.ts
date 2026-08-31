import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ComplianceBindingsService } from './compliance-bindings.service';
import { CreateComplianceBindingDto } from './dto/create-compliance-binding.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance Bindings')
@Controller('compliance-bindings')
@UseGuards(RolesGuard)
export class ComplianceBindingsController {
  constructor(private readonly svc: ComplianceBindingsService) {}
  @Get()
  @Roles(
    'superuser',
    'compliance_officer',
    'project_manager',
    'team_leader',
    'team_member',
    'hr_manager',
    'company_owner',
  )
  @ApiQuery({ name: 'ruleId', required: false })
  @ApiOperation({ summary: 'List compliance bindings' })
  findAll(@CompanyId() companyId: string, @Query('ruleId') ruleId?: string) {
    return this.svc.findAll(companyId, ruleId);
  }
  @Get(':id')
  @Roles(
    'superuser',
    'compliance_officer',
    'project_manager',
    'team_leader',
    'team_member',
    'hr_manager',
    'company_owner',
  )
  @ApiOperation({ summary: 'Get a compliance binding' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }
  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance binding' })
  create(
    @Body() dto: CreateComplianceBindingDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.create(dto);
  }
  @Delete(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Delete a compliance binding' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id);
  }
}
