import { prisma } from '../config/prisma.js';
import { ROLES } from '../utils/roles.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import {
  isBranchManager,
  getBranchScopeId,
  assertBranchManagerScope,
} from '../utils/tenantScope.js';
import { createProcessAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export const EXECUTIVE_ALLOWED_ROLES = [
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.BRANCH_MANAGER,
  'company_owner',
  'system_admin',
  'branch_manager',
];

// Matches no row. Used when a Branch Manager has no Branch-scoped assignment, so they see nothing
// instead of the whole company (fail closed).
const NO_BRANCH = '__no_branch_scope__';

const DONE_TASK_STATUSES = ['Completed', 'Cancelled'];
const OPEN_TASK_STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked'];
const CLOSED_PROJECT_STATUSES = ['Completed', 'Cancelled'];
const DAY_MS = 24 * 60 * 60 * 1000;

const PM_ROLE_FILTER = {
  OR: [
    { label: ROLES.PROJECT_MANAGER },
    { name: 'project_manager' },
    { roleTemplate: { slug: 'project_manager' } },
  ],
};

/**
 * Decides which branch an executive request is limited to.
 * - Branch Manager: always their own branch (a query value is ignored).
 * - Company Owner / System Admin: the requested branch, but only after checking it belongs to
 *   their company. Without this check a foreign branch id returned another tenant's counts.
 * Returns undefined for "whole company".
 */
async function resolveExecutiveBranchId(req) {
  if (isBranchManager(req.user)) {
    return getBranchScopeId(req.user) || NO_BRANCH;
  }
  const requested = req.query.branchId ? String(req.query.branchId).trim() : '';
  if (!requested) return undefined;
  const branch = await prisma.branch.findFirst({
    where: { id: requested, companyId: req.user.companyId },
    select: { id: true },
  });
  if (!branch) throw new NotFoundError('Branch not found in this company');
  return branch.id;
}

/** Compliance violations point at a Task, Project or User by entityType/entityId (no relation). */
async function buildViolationScope(companyId, branchId) {
  if (!branchId) return { companyId };
  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      where: { companyId, team: { branchId } },
      select: { id: true, tasks: { select: { id: true } } },
    }),
    prisma.teamMember.findMany({
      where: { companyId, team: { branchId } },
      select: { userId: true },
    }),
  ]);
  const projectIds = projects.map((p) => p.id);
  const taskIds = projects.flatMap((p) => p.tasks.map((t) => t.id));
  const userIds = [...new Set(users.map((u) => u.userId))];
  return {
    companyId,
    OR: [
      { entityType: 'Task', entityId: { in: taskIds } },
      { entityType: 'Project', entityId: { in: projectIds } },
      { entityType: 'User', entityId: { in: userIds } },
    ],
  };
}

function isOverdue(task, now) {
  return Boolean(task.dueDate) && !DONE_TASK_STATUSES.includes(task.status) && new Date(task.dueDate) < now;
}

/**
 * Rates one project. Rules are deliberately simple so an executive can read the reasons:
 *  - done:      project Completed or Cancelled
 *  - off_track: target date passed, a quarter or more of open tasks overdue,
 *               or a Critical open escalation / violation
 *  - at_risk:   on hold, any overdue or blocked task, any open escalation or violation,
 *               no Project Manager, or target date within 7 days with progress under 75%
 *  - on_track:  none of the above
 */
export function computeProjectHealth(p, now = new Date()) {
  if (CLOSED_PROJECT_STATUSES.includes(p.status)) {
    return { health: 'done', reasons: [] };
  }
  const off = [];
  const risk = [];
  const target = p.targetDate ? new Date(p.targetDate) : null;

  if (target && target < now) off.push('Target date has passed');
  if (p.openTasks > 0 && p.overdueTasks / p.openTasks >= 0.25) {
    off.push(`${p.overdueTasks} of ${p.openTasks} open tasks are overdue`);
  } else if (p.overdueTasks > 0) {
    risk.push(`${p.overdueTasks} overdue task${p.overdueTasks === 1 ? '' : 's'}`);
  }
  if (p.criticalIssues > 0) off.push('Critical escalation or violation open');

  if (p.status === 'OnHold') risk.push('Project is on hold');
  if (p.blockedTasks > 0) risk.push(`${p.blockedTasks} blocked task${p.blockedTasks === 1 ? '' : 's'}`);
  if (p.openEscalations > 0) risk.push(`${p.openEscalations} open escalation${p.openEscalations === 1 ? '' : 's'}`);
  if (p.openViolations > 0) risk.push(`${p.openViolations} open compliance violation${p.openViolations === 1 ? '' : 's'}`);
  if (!p.projectManager) risk.push('No Project Manager assigned');
  if (target && target >= now && target - now <= 7 * DAY_MS && p.progress < 75) {
    risk.push(`Due within 7 days at ${p.progress}% progress`);
  }

  if (off.length) return { health: 'off_track', reasons: [...off, ...risk] };
  if (risk.length) return { health: 'at_risk', reasons: risk };
  return { health: 'on_track', reasons: [] };
}

/**
 * The PM of each project, matching who can actually see and run it (getAssignedProjectIds /
 * buildProjectListWhere): a Project-scoped PM assignment first, otherwise the creator when the
 * creator is an active Project Manager. A Team-scoped PM is not used, because it gives no access
 * to the project.
 */
async function loadProjectManagers(companyId, projects) {
  if (projects.length === 0) return new Map();
  const [assignments, creators] = await Promise.all([
    prisma.roleAssignment.findMany({
      where: {
        companyId,
        revokedAt: null,
        user: { isActive: true },
        role: PM_ROLE_FILTER,
        scopeType: 'Project',
        scopeId: { in: projects.map((p) => p.id) },
      },
      select: { scopeId: true, user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { grantedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        id: { in: [...new Set(projects.map((p) => p.createdById))] },
        roleAssignments: { some: { revokedAt: null, role: PM_ROLE_FILTER } },
      },
      select: { id: true, fullName: true, email: true },
    }),
  ]);
  const byProject = new Map();
  for (const a of assignments) {
    if (!byProject.has(a.scopeId)) byProject.set(a.scopeId, a.user);
  }
  const pmCreators = new Map(creators.map((u) => [u.id, u]));
  const result = new Map();
  for (const p of projects) {
    result.set(p.id, byProject.get(p.id) || pmCreators.get(p.createdById) || null);
  }
  return result;
}

/**
 * Loads everything the portfolio and branch views need in a few queries, then rolls it up per
 * project in memory (company data sizes here are small).
 */
async function loadPortfolio(companyId, branchId) {
  const now = new Date();
  const projects = await prisma.project.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(branchId ? { team: { branchId } } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      targetDate: true,
      teamId: true,
      createdById: true,
      createdAt: true,
      team: { select: { id: true, name: true, branch: { select: { id: true, name: true, code: true } } } },
      tasks: {
        where: { deletedAt: null },
        select: { id: true, status: true, dueDate: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const projectIds = projects.map((p) => p.id);
  const taskToProject = new Map();
  for (const p of projects) for (const t of p.tasks) taskToProject.set(t.id, p.id);

  const [escalations, violations, managers] = await Promise.all([
    prisma.escalation.findMany({
      where: {
        companyId,
        status: 'Open',
        OR: [
          { projectId: { in: projectIds } },
          { task: { projectId: { in: projectIds } } },
        ],
      },
      select: { projectId: true, priority: true, task: { select: { projectId: true } } },
    }),
    prisma.complianceViolation.findMany({
      where: {
        companyId,
        status: 'Open',
        OR: [
          { entityType: 'Project', entityId: { in: projectIds } },
          { entityType: 'Task', entityId: { in: [...taskToProject.keys()] } },
        ],
      },
      select: { entityType: true, entityId: true, severity: true },
    }),
    loadProjectManagers(companyId, projects),
  ]);

  const issueCounts = new Map(projectIds.map((id) => [id, { esc: 0, vio: 0, critical: 0 }]));
  for (const e of escalations) {
    const pid = e.projectId || e.task?.projectId;
    const c = issueCounts.get(pid);
    if (!c) continue;
    c.esc += 1;
    if (e.priority === 'Critical') c.critical += 1;
  }
  for (const v of violations) {
    const pid = v.entityType === 'Project' ? v.entityId : taskToProject.get(v.entityId);
    const c = issueCounts.get(pid);
    if (!c) continue;
    c.vio += 1;
    if (v.severity === 'Critical') c.critical += 1;
  }

  return projects.map((p) => {
    const counted = p.tasks.filter((t) => t.status !== 'Cancelled');
    const completedTasks = counted.filter((t) => t.status === 'Completed').length;
    const openTasks = p.tasks.filter((t) => OPEN_TASK_STATUSES.includes(t.status)).length;
    const row = {
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.startDate,
      targetDate: p.targetDate,
      createdAt: p.createdAt,
      team: p.team ? { id: p.team.id, name: p.team.name } : null,
      branch: p.team?.branch || null,
      projectManager: managers.get(p.id) || null,
      totalTasks: counted.length,
      completedTasks,
      openTasks,
      overdueTasks: p.tasks.filter((t) => isOverdue(t, now)).length,
      blockedTasks: p.tasks.filter((t) => t.status === 'Blocked').length,
      openEscalations: issueCounts.get(p.id).esc,
      openViolations: issueCounts.get(p.id).vio,
      criticalIssues: issueCounts.get(p.id).critical,
      progress: counted.length ? Math.round((completedTasks / counted.length) * 100) : 0,
    };
    return { ...row, ...computeProjectHealth(row, now) };
  });
}

/**
 * GET /executive/branches & GET /api/executive/branches
 * Company branches. A Branch Manager gets only their own branch, or nothing when they have no
 * Branch-scoped assignment (it used to fall back to every branch in the company).
 */
export async function getExecutiveBranches(req, res, next) {
  try {
    const companyId = req.user.companyId;
    let where = { companyId };
    if (isBranchManager(req.user)) {
      const scoped = getBranchScopeId(req.user);
      if (!scoped) return res.status(200).json({ success: true, data: [] });
      where = { id: scoped, companyId };
    }
    const branches = await prisma.branch.findMany({
      where,
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
 * High-level executive KPIs and trends for the company or one branch.
 */
export async function getExecutiveMetrics(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const effectiveBranchId = await resolveExecutiveBranchId(req);
    const now = new Date();

    const teamFilter = effectiveBranchId
      ? { companyId, branchId: effectiveBranchId }
      : { branch: { companyId } };

    const projectFilter = effectiveBranchId
      ? { companyId, deletedAt: null, team: { branchId: effectiveBranchId } }
      : { companyId, deletedAt: null };

    const taskBranchFilter = effectiveBranchId
      ? { companyId, deletedAt: null, project: { deletedAt: null, team: { branchId: effectiveBranchId } } }
      : { companyId, deletedAt: null };

    const escalationFilter = effectiveBranchId
      ? {
          companyId,
          status: 'Open',
          OR: [
            { project: { team: { branchId: effectiveBranchId } } },
            { task: { project: { team: { branchId: effectiveBranchId } } } },
          ],
        }
      : { companyId, status: 'Open' };

    const violationFilter = {
      ...(await buildViolationScope(companyId, effectiveBranchId)),
      status: 'Open',
    };

    const [
      totalUsers,
      totalTeams,
      totalBranches,
      activeProjects,
      totalProjects,
      activeTasks,
      completedTasks,
      blockedTasks,
      overdueTasks,
      openEscalations,
      openViolations,
      subscription,
      branchDistribution,
      recentViolations,
      recentEscalations,
      totalComplianceRules,
      totalProcessTemplates,
    ] = await Promise.all([
      prisma.user.count({
        where: effectiveBranchId
          ? {
              companyId,
              isActive: true,
              teamMembers: { some: { team: { branchId: effectiveBranchId } } },
            }
          : { companyId, isActive: true },
      }),
      prisma.team.count({ where: teamFilter }),
      effectiveBranchId ? (effectiveBranchId === NO_BRANCH ? 0 : 1) : prisma.branch.count({ where: { companyId } }),
      prisma.project.count({ where: { ...projectFilter, status: 'Active' } }),
      prisma.project.count({ where: projectFilter }),
      // Blocked work is still in flight; it used to drop out of every total.
      prisma.task.count({ where: { ...taskBranchFilter, status: { in: OPEN_TASK_STATUSES } } }),
      prisma.task.count({ where: { ...taskBranchFilter, status: 'Completed' } }),
      prisma.task.count({ where: { ...taskBranchFilter, status: 'Blocked' } }),
      prisma.task.count({
        where: { ...taskBranchFilter, status: { in: OPEN_TASK_STATUSES }, dueDate: { lt: now } },
      }),
      prisma.escalation.count({ where: escalationFilter }),
      // ComplianceViolation has no task relation; the old `task: {...}` filter threw for every
      // branch-scoped request, so a Branch Manager's dashboard always failed.
      prisma.complianceViolation.count({ where: violationFilter }),
      prisma.subscription.findFirst({
        where: { companyId, status: { in: ['Active', 'Trialing', 'PastDue'] } },
        include: { plan: true },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
      prisma.branch.findMany({
        where: effectiveBranchId ? { id: effectiveBranchId, companyId } : { companyId },
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { teams: true } },
          teams: {
            select: {
              id: true,
              name: true,
              _count: { select: { teamMembers: true, projects: { where: { deletedAt: null } } } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.complianceViolation.findMany({
        where: violationFilter,
        select: {
          id: true,
          severity: true,
          detectedAt: true,
          entityType: true,
          entityId: true,
          rule: { select: { id: true, name: true, description: true } },
        },
        take: 5,
        orderBy: { detectedAt: 'desc' },
      }),
      prisma.escalation.findMany({
        where: escalationFilter,
        select: {
          id: true,
          title: true,
          priority: true,
          blockerType: true,
          createdAt: true,
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complianceRule.count({ where: { companyId } }),
      prisma.processTemplate.count({ where: { companyId } }),
    ]);

    // 30-day completion trend
    const thirtyDaysAgo = new Date(now);
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
      const d = new Date(now);
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

    const complianceScore =
      openViolations === 0 ? 100 : Math.max(15, Math.round(100 - openViolations * 15));

    res.status(200).json({
      success: true,
      data: {
        branchId: effectiveBranchId === NO_BRANCH ? null : effectiveBranchId || null,
        totalUsers,
        totalTeams,
        totalBranches,
        activeProjects,
        totalProjects,
        activeTasks,
        completedTasks,
        blockedTasks,
        overdueTasks,
        totalTasks: completedTasks + activeTasks,
        openEscalations,
        openViolations,
        completionRate,
        complianceScore,
        totalComplianceRules,
        totalProcessTemplates,
        planName: subscription?.plan?.name || (subscription?.status === 'Trialing' ? '14-Day Free Trial' : 'Free Tier'),
        subscriptionStatus: subscription?.status || 'Active',
        trialEndsAt: subscription?.status === 'Trialing' ? subscription.currentPeriodEnd : null,
        currentPeriodStart: subscription?.currentPeriodStart || null,
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        billingCycle: subscription?.billingCycle || 'Monthly',
        subscription: subscription ? {
          id: subscription.id,
          planId: subscription.planId,
          planName: subscription.plan?.name || 'Standard Plan',
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.status === 'Trialing' ? subscription.currentPeriodEnd : null,
          plan: subscription.plan,
        } : null,
        planQuotas: {
          maxUsers: subscription?.plan?.maxUsers ?? null,
          maxBranches: subscription?.plan?.maxBranches ?? null,
          maxActiveProcessTemplates: subscription?.plan?.maxActiveProcessTemplates ?? null,
          maxComplianceRules: subscription?.plan?.maxComplianceRules ?? null,
          auditLogRetentionDays: subscription?.plan?.auditLogRetentionDays ?? 90,
          allowsIntegrations: subscription?.plan?.allowsIntegrations ?? true,
        },
        branchDistribution,
        recentViolations,
        recentEscalations,
        taskTrend,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /executive/portfolio & GET /api/executive/portfolio
 * Every project with progress, overdue/blocked work, open issues, PM and a health rating
 * (on_track / at_risk / off_track / done) plus the reasons behind it.
 */
export async function getExecutivePortfolio(req, res, next) {
  try {
    const branchId = await resolveExecutiveBranchId(req);
    const projects = await loadPortfolio(req.user.companyId, branchId);

    const summary = {
      total: projects.length,
      on_track: 0,
      at_risk: 0,
      off_track: 0,
      done: 0,
      withoutManager: 0,
      overdueTasks: 0,
      blockedTasks: 0,
    };
    for (const p of projects) {
      summary[p.health] += 1;
      if (!p.projectManager && p.health !== 'done') summary.withoutManager += 1;
      summary.overdueTasks += p.overdueTasks;
      summary.blockedTasks += p.blockedTasks;
    }

    // Worst first so the projects that need attention lead the list.
    const rank = { off_track: 0, at_risk: 1, on_track: 2, done: 3 };
    projects.sort((a, b) => rank[a.health] - rank[b.health] || a.name.localeCompare(b.name));

    res.status(200).json({ success: true, data: { summary, projects } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /executive/branch-performance & GET /api/executive/branch-performance
 * One row per branch so leadership can compare delivery, risk and headcount side by side.
 */
export async function getBranchPerformance(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const branchId = await resolveExecutiveBranchId(req);

    const [branches, projects] = await Promise.all([
      prisma.branch.findMany({
        where: branchId ? { id: branchId, companyId } : { companyId },
        select: {
          id: true,
          name: true,
          code: true,
          teams: {
            select: {
              id: true,
              teamMembers: { where: { user: { isActive: true } }, select: { userId: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      loadPortfolio(companyId, branchId),
    ]);

    const rows = branches.map((b) => {
      const mine = projects.filter((p) => p.branch?.id === b.id);
      const sum = (key) => mine.reduce((acc, p) => acc + p[key], 0);
      const totalTasks = sum('totalTasks');
      const completedTasks = sum('completedTasks');
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        teams: b.teams.length,
        headcount: new Set(b.teams.flatMap((t) => t.teamMembers.map((m) => m.userId))).size,
        totalProjects: mine.length,
        activeProjects: mine.filter((p) => p.status === 'Active').length,
        atRiskProjects: mine.filter((p) => p.health === 'at_risk').length,
        offTrackProjects: mine.filter((p) => p.health === 'off_track').length,
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
        overdueTasks: sum('overdueTasks'),
        blockedTasks: sum('blockedTasks'),
        openEscalations: sum('openEscalations'),
        openViolations: sum('openViolations'),
      };
    });

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /executive/project-managers & GET /api/executive/project-managers
 * Active users holding the Project Manager role, for the "assign PM" pickers.
 */
export async function listProjectManagers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        roleAssignments: { some: { revokedAt: null, role: PM_ROLE_FILTER } },
      },
      select: { id: true, fullName: true, email: true, jobTitle: true },
      orderBy: { fullName: 'asc' },
    });
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /executive/projects/:id/manager & PATCH /api/executive/projects/:id/manager
 * Body: { projectManagerId }
 * Appoints or replaces the Project Manager of a project. Without this, a project created by an
 * executive had no PM and no PM could ever see it. The previous Project-scoped PM assignment is
 * revoked (kept for history), the change is audit-logged and the new PM is notified.
 */
export async function assignProjectManager(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const pmId = String(req.body?.projectManagerId || req.body?.managerId || '').trim();
    if (!pmId) throw new BadRequestError('projectManagerId is required');

    const project = await prisma.project.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, name: true, status: true, team: { select: { branchId: true } } },
    });
    if (!project) throw new NotFoundError(`Project with ID ${id} not found`);
    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, project.team?.branchId, 'assign managers to projects');
    }
    if (CLOSED_PROJECT_STATUSES.includes(project.status)) {
      throw new ForbiddenError(`A ${project.status.toLowerCase()} project cannot get a new manager`);
    }

    const candidate = await prisma.user.findFirst({
      where: {
        id: pmId,
        companyId,
        isActive: true,
        roleAssignments: { some: { revokedAt: null, role: PM_ROLE_FILTER } },
      },
      select: { id: true, fullName: true, email: true },
    });
    if (!candidate) {
      throw new BadRequestError('projectManagerId must be an active Project Manager in this company');
    }
    const pmRole = await prisma.role.findFirst({ where: { companyId, ...PM_ROLE_FILTER } });
    if (!pmRole) throw new BadRequestError('This company has no Project Manager role configured');

    const current = await prisma.roleAssignment.findMany({
      where: { companyId, scopeType: 'Project', scopeId: project.id, revokedAt: null, role: PM_ROLE_FILTER },
      select: { id: true, userId: true },
    });
    if (current.length === 1 && current[0].userId === candidate.id) {
      return res.status(200).json({
        success: true,
        message: 'This user already manages the project',
        data: { projectId: project.id, projectManager: candidate },
      });
    }

    await prisma.$transaction(async (tx) => {
      if (current.length) {
        await tx.roleAssignment.updateMany({
          where: { id: { in: current.map((a) => a.id) } },
          data: { revokedAt: new Date() },
        });
      }
      await tx.roleAssignment.create({
        data: {
          companyId,
          userId: candidate.id,
          roleId: pmRole.id,
          scopeType: 'Project',
          scopeId: project.id,
          grantedById: req.user.id,
        },
      });
    });

    try {
      await createProcessAuditLog({
        companyId,
        projectId: project.id,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        performedById: req.user.id,
        oldValue: { projectManagerIds: current.map((a) => a.userId) },
        newValue: { projectManagerId: candidate.id },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: PM assignment audit log failed:', auditErr.message);
    }
    try {
      await prisma.notification.create({
        data: {
          companyId,
          userId: candidate.id,
          title: 'You are now managing a project',
          message: `You were appointed Project Manager of "${project.name}".`,
          type: 'Assignment',
        },
      });
    } catch (notifyErr) {
      console.warn('[Notification] PM assignment notice failed:', notifyErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Project Manager assigned',
      data: { projectId: project.id, projectManager: candidate },
    });
  } catch (err) {
    next(err);
  }
}
