import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'compliance_officer',
    'project_manager',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get all audit logs' })
  findAll(@CompanyId() companyId: string) {
    return this.auditLogsService.findAll(companyId);
  }

  @Get('by-user/:userId')
  @Roles('superuser', 'compliance_officer', 'hr_manager')
  @ApiOperation({ summary: 'Get logs for a specific user' })
  findByUser(@Param('userId') userId: string, @CompanyId() companyId: string) {
    return this.auditLogsService.findByUser(userId);
  }

  @Get('by-entity/:entityType/:entityId')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Get logs for a specific entity' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CompanyId() companyId: string,
  ) {
    return this.auditLogsService.findByEntity(entityType, entityId);
  }

  @Post()
  @Roles(
    'superuser',
    'project_manager',
    'compliance_officer',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Create an audit log entry' })
  create(@Body() dto: CreateAuditLogDto, @CompanyId() companyId: string) {
    return this.auditLogsService.create(dto, companyId);
  }
}
