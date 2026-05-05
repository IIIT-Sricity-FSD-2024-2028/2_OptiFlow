import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('guest', 'superuser', 'compliance_officer', 'project_manager', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Get all audit logs' })
  findAll() { return this.auditLogsService.findAll(); }

  @Get('by-user/:userId')
  @Roles('superuser', 'compliance_officer', 'hr_manager')
  @ApiOperation({ summary: 'Get logs for a specific user' })
  findByUser(@Param('userId', ParseIntPipe) userId: number) { return this.auditLogsService.findByUser(userId); }

  @Get('by-entity/:entityType/:entityId')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Get logs for a specific entity' })
  findByEntity(@Param('entityType') entityType: string, @Param('entityId', ParseIntPipe) entityId: number) {
    return this.auditLogsService.findByEntity(entityType, entityId);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'compliance_officer', 'hr_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Create an audit log entry' })
  create(@Body() dto: CreateAuditLogDto) { return this.auditLogsService.create(dto); }
}
