import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ComplianceCategoriesService } from './compliance-categories.service';
import { CreateComplianceCategoryDto } from './dto/create-compliance-category.dto';
import { UpdateComplianceCategoryDto } from './dto/update-compliance-category.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Compliance Categories')
@Controller('compliance-categories')
@UseGuards(RolesGuard)
export class ComplianceCategoriesController {
  constructor(private readonly svc: ComplianceCategoriesService) {}
  @Get()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'List compliance categories' })
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }
  @Get(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a compliance category' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id, companyId);
  }
  @Post()
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Create a compliance category' })
  create(
    @Body() dto: CreateComplianceCategoryDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Update a compliance category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceCategoryDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto, companyId);
  }
  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a compliance category' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id, companyId);
  }
}
