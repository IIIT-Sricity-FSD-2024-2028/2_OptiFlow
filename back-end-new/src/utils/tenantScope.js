import { ForbiddenError } from './errors.js';
import { normalizeRole, toCanonicalRole, ROLES } from './roles.js';

/**
 * Checks if the request user is a Company Owner / CEO (global company access)
 */
export function isCompanyOwner(user) {
  if (!user) return false;
  const canonical = toCanonicalRole(user.roleLabel || user.role);
  if (canonical === ROLES.COMPANY_OWNER) return true;

  const label = (user.roleLabel || '').toLowerCase();
  const slug = (user.role || '').toLowerCase();

  return (
    label.includes('owner') ||
    label.includes('ceo') ||
    label.includes('cto') ||
    label.includes('coo') ||
    slug === 'superuser' ||
    slug === 'company_owner'
  );
}

/**
 * Checks if the request user is a Branch Manager (branch-scoped access)
 */
export function isBranchManager(user) {
  if (!user) return false;
  const canonical = toCanonicalRole(user.roleLabel || user.role);
  if (canonical === ROLES.BRANCH_MANAGER) return true;

  const label = (user.roleLabel || '').toLowerCase();
  const slug = (user.role || '').toLowerCase();

  return label.includes('branch manager') || slug === 'branch_manager';
}

/**
 * Resolves the effective branch filter for scoped queries
 */
export function resolveEffectiveBranchId({ user, branchId }) {
  if (isBranchManager(user) && user?.scopeId) {
    return user.scopeId;
  }
  if (isCompanyOwner(user) && branchId) {
    return branchId;
  }
  return undefined;
}

/**
 * Builds Prisma where filter for Project queries with strict role-based scope
 */
export function buildProjectListWhere({ companyId, branchId, user }) {
  const effectiveBranchId = resolveEffectiveBranchId({ user, branchId });
  const role = normalizeRole(user?.role || user?.roleLabel);

  const baseWhere = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
  };

  // 1. Company Owner / Global Executive: views all company projects
  if (isCompanyOwner(user) && !effectiveBranchId) {
    return baseWhere;
  }

  // 2. Branch Manager: views all projects within their branch
  if (effectiveBranchId) {
    return {
      ...baseWhere,
      team: {
        branchId: effectiveBranchId,
        ...(companyId ? { branch: { companyId } } : {}),
      },
    };
  }

  // 3. Project Manager: views projects they created OR where they are explicitly associated
  if ((role === 'project_manager' || role === 'pm') && user?.id) {
    return {
      ...baseWhere,
      createdById: user.id,
    };
  }

  // 4. Team Lead: views projects assigned to teams they lead or belong to
  if ((role === 'team_lead' || role === 'team_leader' || role === 'lead') && user?.id) {
    return {
      ...baseWhere,
      team: {
        teamMembers: {
          some: {
            userId: user.id,
          },
        },
      },
    };
  }

  // 5. Team Member: views projects belonging to teams they are member of
  if ((role === 'team_member' || role === 'member') && user?.id) {
    return {
      ...baseWhere,
      team: {
        teamMembers: {
          some: {
            userId: user.id,
          },
        },
      },
    };
  }

  return baseWhere;
}

/**
 * Builds Prisma where filter for Task queries with strict role-based scope
 */
export function buildTaskListWhere({ companyId, branchId, user }) {
  const effectiveBranchId = resolveEffectiveBranchId({ user, branchId });

  const where = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
  };

  // 1. Company Owner: views all tasks across company
  if (isCompanyOwner(user) && !effectiveBranchId) {
    return where;
  }

  // 2. Branch Manager: views all tasks within their branch
  if (effectiveBranchId) {
    return {
      ...where,
      project: {
        team: {
          branchId: effectiveBranchId,
          ...(companyId ? { branch: { companyId } } : {}),
        },
      },
    };
  }

  const role = normalizeRole(user?.role || user?.roleLabel);

  // 3. Project Manager: views tasks under their managed projects OR created by them
  if ((role === 'project_manager' || role === 'pm') && user?.id) {
    return {
      ...where,
      OR: [
        { createdById: user.id },
        { project: { createdById: user.id } },
        { assignedToId: user.id },
      ],
    };
  }

  // 4. Team Lead: views tasks assigned to them, tasks under their team's projects, or assigned to their direct reports
  if ((role === 'team_lead' || role === 'team_leader' || role === 'lead') && user?.id) {
    return {
      ...where,
      OR: [
        { assignedToId: user.id },
        { createdById: user.id },
        { assignedTo: { managerUserId: user.id } },
        { project: { team: { teamMembers: { some: { userId: user.id } } } } },
      ],
    };
  }

  // 5. Team Member: strictly tasks assigned directly to them or where they created them
  if ((role === 'team_member' || role === 'member') && user?.id) {
    return {
      ...where,
      OR: [
        { assignedToId: user.id },
        { subtasks: { some: { assignedToId: user.id, deletedAt: null } } },
      ],
    };
  }

  return where;
}

/**
 * Builds Prisma where filter for company violations
 */
export function buildViolationCompanyWhere({ companyId }) {
  return companyId ? { companyId } : {};
}

/**
 * Builds branch-scoped compliance violation filter (projects + tasks in branch)
 */
export async function buildBranchViolationWhere(prisma, companyId, branchId) {
  if (!prisma || !companyId || !branchId) {
    return companyId ? { companyId } : {};
  }

  const branchProjects = await prisma.project.findMany({
    where: { team: { branchId, branch: { companyId } } },
    select: { id: true },
  });

  const branchTasks = await prisma.task.findMany({
    where: {
      companyId,
      deletedAt: null,
      project: { team: { branchId, branch: { companyId } } },
    },
    select: { id: true },
  });

  const projectIds = branchProjects.map((p) => p.id);
  const taskIds = branchTasks.map((t) => t.id);

  return {
    companyId,
    OR: [
      { entityType: 'Project', entityId: { in: projectIds } },
      { entityType: 'Task', entityId: { in: taskIds } },
    ],
  };
}

/**
 * Resolves branch filter for executive metrics
 */
export function resolveMetricsBranchId(user, queryBranchId) {
  if (isBranchManager(user) && user?.scopeId) {
    return user.scopeId;
  }
  if (isCompanyOwner(user) && queryBranchId) {
    return queryBranchId;
  }
  return undefined;
}

/**
 * Ensures a Branch Manager can only act within their assigned branch scope
 */
export function assertBranchManagerScope(user, branchId, action = 'access this resource') {
  if (!isBranchManager(user) || !user?.scopeId) return;
  if (!branchId || branchId !== user.scopeId) {
    throw new ForbiddenError(`Branch Managers can only ${action} within their assigned branch.`);
  }
}

