import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/guards/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles('Company Owner')
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Executive dashboard metrics' })
  @ApiResponse({
    status: 200,
    description: 'Returns dashboard KPI summary for the company.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden – Company Owner only.' })
  async getDashboardMetrics(@CompanyId() companyId: string) {
    const [activeProjects, complianceViolations, tasksRaw, openEscalations] =
      await Promise.all([
        // Total active Projects
        this.prisma.project.count({
          where: { status: 'Active', team: { branch: { companyId } } },
        }),
        // Count of ComplianceViolations (Open or Under_Review)
        this.prisma.complianceViolation.count({
          where: {
            companyId,
            status: { in: ['Open', 'Under_Review'] },
          },
        }),
        // Count of Tasks grouped by status
        this.prisma.task.groupBy({
          by: ['status'],
          where: { companyId, deletedAt: null },
          _count: true,
        }),
        // Count of open Escalations
        this.prisma.escalation.count({
          where: { companyId, status: 'Open' },
        }),
      ]);

    const tasksCount = {
      Draft: 0,
      Active: 0,
      Completed: 0,
      Blocked: 0,
    };

    tasksRaw.forEach((t) => {
      if (tasksCount[t.status] !== undefined) {
        tasksCount[t.status] = t._count;
      }
    });

    return {
      success: true,
      data: {
        activeProjects,
        complianceViolations,
        tasks: tasksCount,
        openEscalations,
      },
    };
  }
}
