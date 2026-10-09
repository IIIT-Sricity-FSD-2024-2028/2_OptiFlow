import { prisma } from '../config/prisma.js';
import { ROLES } from '../utils/roles.js';
import {
  isBranchManager,
  resolveMetricsBranchId,
  assertBranchManagerScope,
} from '../utils/tenantScope.js';


export const EXECUTIVE_ALLOWED_ROLES = [
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.BRANCH_MANAGER,
  'company_owner',
  'system_admin',
  'branch_manager',
  'superuser',
  'executive',
];

/**
 * GET /executive/branches & GET /api/executive/branches
 * Retrieves company branches, scoped to caller's branch if Branch Manager.
 */
export async function getExecutiveBranches(req, res, next) {
  try {
    const companyId = req.user.companyId;

    if (isBranchManager(req.user) && req.user.scopeId) {
      const branches = await prisma.branch.findMany({
        where: { id: req.user.scopeId, companyId },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: branches });
    }

    const branches = await prisma.branch.findMany({
      where: { companyId },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /executive/metrics & GET /api/executive/metrics & GET /metrics & GET /api/metrics
 * Calculates high-level executive KPIs and trends for the company.
 */
export async function getExecutiveMetrics(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const requestedBranchId = req.query.branchId ? String(req.query.branchId).trim() : undefined;
    const effectiveBranchId = resolveMetricsBranchId(req.user, requestedBranchId);

    const teamFilter = effectiveBranchId
      ? { branchId: effectiveBranchId }
      : { branch: { companyId } };

    const projectFilter = effectiveBranchId
      ? { team: { branchId: effectiveBranchId } }
      : { team: { branch: { companyId } } };

    const taskBranchFilter = effectiveBranchId
      ? { project: { team: { branchId: effectiveBranchId } } }
      : { companyId };

    const [
      totalUsers,
      totalTeams,
      totalBranches,
      activeProjects,
      totalProjects,
      activeTasks,
      completedTasks,
      openEscalations,
      openViolations,
      subscription,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.team.count({ where: teamFilter }),
      effectiveBranchId ? 1 : prisma.branch.count({ where: { companyId } }),
      prisma.project.count({ where: { ...projectFilter, status: 'Active' } }),
      prisma.project.count({ where: projectFilter }),
      prisma.task.count({ where: { ...taskBranchFilter, status: { in: ['Active', 'In_Review', 'Draft'] } } }),
      prisma.task.count({ where: { ...taskBranchFilter, status: 'Completed' } }),
      prisma.escalation.count({ where: { companyId, status: 'Open' } }),
      prisma.complianceViolation.count({ where: { companyId, status: 'Open' } }),
      prisma.subscription.findFirst({
        where: { companyId, status: 'Active' },
        include: { plan: true },
      }),
    ]);

    // 30-day completion trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedTasks = await prisma.task.findMany({
      where: {
        ...taskBranchFilter,
        status: 'Completed',
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { completedAt: true },
    });

    const taskTrend = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      taskTrend[d.toISOString().split('T')[0]] = 0;
    }
    recentCompletedTasks.forEach((t) => {
      if (t.completedAt) {
        const key = t.completedAt.toISOString().split('T')[0];
        if (taskTrend[key] !== undefined) {
          taskTrend[key]++;
        }
      }
    });

    const completionRate =
      completedTasks + activeTasks > 0
        ? Math.round((completedTasks / (completedTasks + activeTasks)) * 100)
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalTeams,
        totalBranches,
        activeProjects,
        totalProjects,
        activeTasks,
        completedTasks,
        openEscalations,
        openViolations,
        completionRate,
        planName: subscription?.plan?.name || 'Free Tier',
        taskTrend,
      },
    });
  } catch (err) {
    next(err);
  }
}

