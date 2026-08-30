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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(RolesGuard)
export class PermissionsController {
  constructor(private readonly svc: PermissionsService) {}
  @Get()
  @Roles(
    'platform_admin',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'List permissions' })
  findAll(@CompanyId() companyId: string) {
    return this.svc.findAll(companyId);
  }
  @Get(':id')
  @Roles(
    'platform_admin',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a permission' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id, companyId);
  }
  @Post()
  @Roles('platform_admin', 'superuser')
  @ApiOperation({ summary: 'Create a permission' })
  create(@Body() dto: CreatePermissionDto, @CompanyId() companyId: string) {
    return this.svc.create(dto, companyId);
  }
  @Patch(':id')
  @Roles('platform_admin', 'superuser')
  @ApiOperation({ summary: 'Update a permission' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto, companyId);
  }
  @Delete(':id')
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Delete a permission' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id, companyId);
  }
}
