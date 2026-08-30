import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import {
  isBranchManager,
  resolveMetricsBranchId,
} from '../../core/utils/tenant-scope.util';

@ApiTags('Executive')
@Controller('executive')
@UseGuards(RolesGuard)
export class ExecutiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('branches')
  @Roles('Company Owner', 'superuser', 'Branch Manager')
  @ApiOperation({ summary: 'Get all branches for company' })
  async getBranches(@CompanyId() companyId: string, @Request() req: any) {
    if (!companyId) return [];

    if (isBranchManager(req.user) && req.user?.scopeId) {
      return this.prisma.branch.findMany({
        where: { id: req.user.scopeId, companyId },
        select: { id: true, name: true },
      });
    }

    return this.prisma.branch.findMany({
      where: { companyId },
      select: { id: true, name: true }
    });
  }

  @Get('metrics')
  @Roles('Company Owner', 'superuser', 'Branch Manager')
  @ApiOperation({ summary: 'Get Executive metrics for company owner' })
  async getMetrics(
    @CompanyId() companyId: string,
    @Query('branchId') branchId: string | undefined,
    @Request() req: any,
  ) {
    if (!companyId) return {};

    const effectiveBranchId = resolveMetricsBranchId(req.user, branchId);

    const teamFilter = effectiveBranchId ? { branchId: effectiveBranchId } : { branch: { companyId } };
    const projectFilter = effectiveBranchId ? { team: { branchId: effectiveBranchId } } : { team: { branch: { companyId } } };
    const taskBranchFilter = effectiveBranchId ? { project: { team: { branchId: effectiveBranchId } } } : { companyId };
    
    // For ComplianceViolations and Escalations, they might not have a direct branch link unless we go through entityId.
    // If we want a simple approach: if branchId is provided, we can filter users in that branch? 
    // Wait, `User` belongs to `companyId`. How is `User` tied to `Branch`? In our schema, User does not have branchId directly. Team has branchId. User is in Team? 
    // Let's check schema for User / Branch relationship.
    
    // Let's use the requested approach: "Projects, Tasks, Escalations, and Violations. Note the schema path: Tasks and Projects belong to a Team, and Teams belong to a Branch"
    // Wait, do Escalations and Violations belong to a Team?
    
    const totalUsers = await this.prisma.user.count({ where: { companyId } });
    const totalTeams = await this.prisma.team.count({ where: teamFilter });
    const totalBranches = effectiveBranchId
      ? 1
      : await this.prisma.branch.count({ where: { companyId } });
    const activeProjects = await this.prisma.project.count({ where: { ...projectFilter, status: 'Active' } });

    const subscription = await this.prisma.subscription.findFirst({
      where: { companyId, status: 'Active' },
      include: { plan: true },
    });

    // 1. Task Completion Trend (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompletedTasks = await this.prisma.task.findMany({
      where: { ...taskBranchFilter, status: 'Completed', completedAt: { gte: thirtyDaysAgo } },
      select: { completedAt: true }
    });
    
    const taskTrend = {};
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        taskTrend[d.toISOString().split('T')[0]] = 0;
    }
    recentCompletedTasks.forEach(t => {
        if(t.completedAt) {
            const dateStr = t.completedAt.toISOString().split('T')[0];
            if(taskTrend[dateStr] !== undefined) taskTrend[dateStr]++;
        }
    });

    // 2. Department Breakdown (Projects & Tasks by Team)
    const teamsData = await this.prisma.team.findMany({
      where: teamFilter,
      select: {
        name: true,
        _count: {
          select: { projects: { where: { status: 'Active' } } }
        },
        projects: {
          select: {
            _count: { select: { tasks: { where: { status: { not: 'Completed' } } } } }
          }
        }
      }
    });

    const teamBreakdown = teamsData.map(t => {
      const activeTasks = t.projects.reduce((sum, p) => sum + p._count.tasks, 0);
      return {
        teamName: t.name,
        activeProjects: t._count.projects,
        activeTasks
      };
    });

    // Branch Comparison Data (CEO sees all; Branch Manager sees only their branch)
    const branchComparisonWhere = effectiveBranchId
      ? { companyId, id: effectiveBranchId }
      : { companyId };

    const allBranches = await this.prisma.branch.findMany({
      where: branchComparisonWhere,
      include: {
        teams: {
          include: {
            projects: {
              select: {
                status: true,
                id: true, // We need to match violations to these project ids
              }
            }
          }
        }
      }
    });
    
    // Fetch all open violations for the company to map them
    const allCompanyViolations = await this.prisma.complianceViolation.findMany({
      where: { companyId, status: { in: ['Open', 'Under_Review'] } }
    });

    const branchComparison = allBranches.map(b => {
      let activeProjectsCount = 0;
      let openViolationsCount = 0;
      
      const branchProjectIds = new Set();
      
      b.teams.forEach(t => {
        t.projects.forEach(p => {
          if (p.status === 'Active') activeProjectsCount++;
          branchProjectIds.add(p.id);
        });
      });
      
      // Match violations to branch projects
      // For tasks, we'd need task ids. For simplicity, we just count violations where entityType='Project' and entityId is in branchProjectIds.
      allCompanyViolations.forEach(v => {
        if (v.entityType === 'Project' && branchProjectIds.has(v.entityId)) {
          openViolationsCount++;
        }
      });
      
      return {
        branchName: b.name,
        activeProjects: activeProjectsCount,
        openViolations: openViolationsCount
      };
    });

    // If branchId is provided, filter violations by those associated with the branch's projects/tasks
    // This is complex in Prisma. A simple fallback: return all company violations if no strict relation mapping is possible, 
    // OR map violations whose entityId is a Project belonging to this branch.
    // Let's get all Project IDs for this branch
    let branchProjectIds: string[] | null = null;
    if (effectiveBranchId) {
      const bp = await this.prisma.project.findMany({ where: { team: { branchId: effectiveBranchId } }, select: { id: true } });
      branchProjectIds = bp.map(p => p.id);
    }
    
    const violationFilter = effectiveBranchId && branchProjectIds 
      ? { companyId, status: { in: ['Open', 'Under_Review'] }, entityType: 'Project', entityId: { in: branchProjectIds } }
      : { companyId, status: { in: ['Open', 'Under_Review'] } };

    const complianceViolationsRaw = await this.prisma.complianceViolation.findMany({
      where: violationFilter as any,
      include: { rule: true }
    });
    
    const healthScore = Math.max(0, 100 - (complianceViolationsRaw.length * 2));
    const highPriorityViolations = complianceViolationsRaw
        .filter(v => v.severity === 'High' || v.severity === 'Critical')
        .map(v => ({
            id: v.id,
            entityName: v.rule.name,
            severity: v.severity,
            status: v.status,
            detectedAt: v.detectedAt,
            assignedOwner: 'System'
        }));

    // For escalations, filter by task -> project -> branch
    let escalationFilter: any = { companyId, status: 'Open' };
    if (effectiveBranchId && branchProjectIds) {
       // Escalations are tied to tasks. Let's find tasks for this branch's projects.
       const branchTasks = await this.prisma.task.findMany({ where: { projectId: { in: branchProjectIds } }, select: { id: true }});
       const branchTaskIds = branchTasks.map(t => t.id);
       escalationFilter = { companyId, status: 'Open', taskId: { in: branchTaskIds } };
    }

    const openEscalations = await this.prisma.escalation.findMany({
      where: escalationFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { 
          task: { select: { title: true, assignedTo: { select: { fullName: true } } } },
          reportedBy: { select: { fullName: true } }
      }
    });

    const delayedProjectsCount = await this.prisma.project.count({
      where: { ...projectFilter, status: 'Delayed' }
    });

    const formattedEscalations = openEscalations.map(e => ({
        id: e.id,
        entityName: e.title || e.description,
        reportedDate: e.createdAt,
        assignedOwner: e.task?.assignedTo?.fullName || e.reportedBy?.fullName || 'Unassigned',
        taskTitle: e.task?.title
    }));

    return {
      totalUsers,
      totalTeams,
      totalBranches,
      activeProjects,
      delayedProjectsCount,
      subscription: subscription ? {
        planName: subscription.plan.name,
        status: subscription.status,
        expires: subscription.currentPeriodEnd
      } : null,
      healthScore,
      taskTrend,
      teamBreakdown,
      branchComparison,
      openEscalations: formattedEscalations,
      highPriorityViolations,
    };
  }
}
