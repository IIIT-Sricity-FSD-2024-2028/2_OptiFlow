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

// Matches no row; used when a Branch Manager has no Branch-scoped assignment.
const NO_BRANCH = '__no_branch_scope__';

/**
 * Returns the branch id a Branch Manager is scoped to, or null when the
 * active assignment is not Branch-scoped.
 */
export function getBranchScopeId(user) {
  if (!user?.scopeId || user.scopeType !== 'Branch') return null;
  return user.scopeId;
}

/**
 * Project ids a Project Manager holds through Project-scoped role assignments.
 */
export async function getAssignedProjectIds(prisma, user) {
  const role = normalizeRole(user?.role || user?.roleLabel);
  if (!user?.id || (role !== 'project_manager' && role !== 'pm')) return [];
  const assignments = await prisma.roleAssignment.findMany({
    where: {
      userId: user.id,
      companyId: user.companyId,
      revokedAt: null,
      scopeType: 'Project',
      role: {
        OR: [
          { label: ROLES.PROJECT_MANAGER },
          { name: 'project_manager' },
          { roleTemplate: { slug: 'project_manager' } },
        ],
      },
    },
    select: { scopeId: true },
  });
  return assignments.map(({ scopeId }) => scopeId);
}

/**
 * Resolves the effective branch filter for scoped queries
 */
export function resolveEffectiveBranchId({ user, branchId }) {
  if (isBranchManager(user)) {
    return getBranchScopeId(user) || NO_BRANCH;
  }
  if (isCompanyOwner(user) && branchId) {
    return branchId;
  }
  return undefined;
}

/**
 * Builds Prisma where filter for Project queries with strict role-based scope
 */
export function buildProjectListWhere({ companyId, branchId, user, assignedProjectIds = [] }) {
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

  // PMs can access projects they created or were explicitly assigned.
  if (role === 'project_manager' || role === 'pm') {
    return {
      ...baseWhere,
      OR: [
        { createdById: user.id },
        ...(assignedProjectIds.length > 0 ? [{ id: { in: assignedProjectIds } }] : []),
      ],
    };
  }

  // Team Leads only see projects with parent tasks assigned directly to them.
  if ((role === 'team_lead' || role === 'team_leader' || role === 'lead') && user?.id) {
    return {
      ...baseWhere,
      tasks: {
        some: {
          ...buildTaskListWhere({ companyId, user }),
        },
      },
    };
  }

  // Team Members only see projects containing subtasks assigned to them.
  if ((role === 'team_member' || role === 'member') && user?.id) {
    return {
      ...baseWhere,
      tasks: {
        some: {
          ...buildTaskListWhere({ companyId, user }),
        },
      },
    };
  }

  return baseWhere;
}

/**
 * Builds Prisma where filter for Task queries with strict role-based scope
 */
export function buildTaskListWhere({ companyId, branchId, user, assignedProjectIds = [] }) {
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

  // Project Managers see tasks they created and tasks in projects they run.
  if (role === 'project_manager' || role === 'pm') {
    return {
      ...where,
      OR: [
        { createdById: user.id },
        { project: { createdById: user.id } },
        ...(assignedProjectIds.length > 0 ? [{ projectId: { in: assignedProjectIds } }] : []),
      ],
    };
  }

  // Team Leads only see parent tasks allocated directly to them.
  if ((role === 'team_lead' || role === 'team_leader' || role === 'lead') && user?.id) {
    return { ...where, assignedToId: user.id };
  }

  // Team Members see parent-task context when directly assigned or when they have an assigned subtask.
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
 * Builds Prisma where filter for subtasks according to the caller's task role.
 */
export function buildSubtaskListWhere({ companyId, branchId, user, assignedProjectIds = [] }) {
  // Subtasks of a soft-deleted parent task are hidden for every role.
  const where = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
    task: { is: { deletedAt: null } },
  };
  const effectiveBranchId = resolveEffectiveBranchId({ user, branchId });
  const role = normalizeRole(user?.role || user?.roleLabel);

  if (effectiveBranchId) {
    return {
      ...where,
      task: {
        is: {
          deletedAt: null,
          project: {
            is: {
              team: {
                branchId: effectiveBranchId,
                ...(companyId ? { branch: { companyId } } : {}),
              },
            },
          },
        },
      },
    };
  }

  if ((role === 'team_member' || role === 'member') && user?.id) {
    return { ...where, assignedToId: user.id };
  }

  if ((role === 'team_lead' || role === 'team_leader' || role === 'lead') && user?.id) {
    return { ...where, task: { is: { assignedToId: user.id, deletedAt: null } } };
  }

  if ((role === 'project_manager' || role === 'pm') && user?.id) {
    return {
      ...where,
      task: {
        is: {
          deletedAt: null,
          OR: [
            { createdById: user.id },
            { project: { createdById: user.id } },
            ...(assignedProjectIds.length > 0 ? [{ projectId: { in: assignedProjectIds } }] : []),
          ],
        },
      },
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
  if (isBranchManager(user)) {
    return getBranchScopeId(user) || NO_BRANCH;
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
  if (!isBranchManager(user)) return;
  const scopedBranchId = getBranchScopeId(user);
  if (!scopedBranchId || !branchId || branchId !== scopedBranchId) {
    throw new ForbiddenError(`Branch Managers can only ${action} within their assigned branch.`);
  }
}
