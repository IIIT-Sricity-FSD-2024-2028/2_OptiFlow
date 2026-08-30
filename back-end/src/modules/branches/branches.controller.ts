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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(RolesGuard)
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}
  @Get()
  @Roles(
    'superuser',
    'company_owner',
    'Company Owner',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
    'System Admin',
  )
  @ApiOperation({ summary: 'List branches' })
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
    'System Admin',
  )
  @ApiOperation({ summary: 'Get a branch' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id, companyId);
  }
  @Post()
  @Roles('System Admin', 'system_admin')
  @ApiOperation({ summary: 'Create a branch' })
  create(@Body() dto: CreateBranchDto, @CompanyId() companyId: string) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('System Admin', 'system_admin')
  @ApiOperation({ summary: 'Update a branch' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto, companyId);
  }
  @Delete(':id')
  @Roles('System Admin', 'system_admin')
  @ApiOperation({ summary: 'Delete a branch' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id, companyId);
  }
}
