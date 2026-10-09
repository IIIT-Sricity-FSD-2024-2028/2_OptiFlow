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
 * Builds Prisma where filter for Project queries
 */
export function buildProjectListWhere({ companyId, branchId, user }) {
  const effectiveBranchId = resolveEffectiveBranchId({ user, branchId });

  if (isCompanyOwner(user) && !effectiveBranchId) {
    return companyId ? { team: { branch: { companyId } } } : {};
  }

  if (effectiveBranchId) {
    return {
      team: {
        branchId: effectiveBranchId,
        ...(companyId ? { branch: { companyId } } : {}),
      },
    };
  }

  return companyId ? { team: { branch: { companyId } } } : {};
}

/**
 * Builds Prisma where filter for Task queries
 */
export function buildTaskListWhere({ companyId, branchId, user }) {
  const effectiveBranchId = resolveEffectiveBranchId({ user, branchId });

  const where = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
  };

  if (isCompanyOwner(user) && !effectiveBranchId) {
    return where;
  }

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
  if ((role === 'team_member' || role === 'member') && user?.id) {
    where.assignedToId = user.id;
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

