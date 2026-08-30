import { RequestUser } from '../middleware/tenant.middleware';
import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

/**
 * Returns true when the request user is a Company Owner / CEO (or equivalent).
 */
export function isCompanyOwner(user?: RequestUser | null): boolean {
  if (!user) return false;

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
 * Returns true when the request user is a Branch Manager (director-level, branch-scoped).
 */
export function isBranchManager(user?: RequestUser | null): boolean {
  if (!user) return false;

  const label = (user.roleLabel || '').toLowerCase();
  const slug = (user.role || '').toLowerCase();

  return label.includes('branch manager') || slug === 'branch_manager';
}

export interface TenantListScope {
  companyId: string;
  branchId?: string;
  user?: RequestUser;
}

/**
 * Resolves the effective branch filter for list queries.
 * - Branch Manager: always forced to assigned scopeId (ignores query param).
 * - Company Owner: optional query branchId for drill-down.
 */
export function resolveEffectiveBranchId(
  scope: TenantListScope,
): string | undefined {
  const { user, branchId } = scope;

  if (isBranchManager(user) && user?.scopeId) {
    return user.scopeId;
  }

  if (isCompanyOwner(user) && branchId) {
    return branchId;
  }

  return undefined;
}

export function buildProjectListWhere(
  scope: TenantListScope,
): Prisma.ProjectWhereInput {
  const { companyId, user } = scope;
  const effectiveBranchId = resolveEffectiveBranchId(scope);

  if (isCompanyOwner(user) && !effectiveBranchId) {
    return { team: { branch: { companyId } } };
  }

  if (effectiveBranchId) {
    return {
      team: {
        branchId: effectiveBranchId,
        branch: { companyId },
      },
    };
  }

  return {
    ...(companyId ? { team: { branch: { companyId } } } : {}),
  };
}

export function buildTaskListWhere(
  scope: TenantListScope,
): Prisma.TaskWhereInput {
  const { companyId, user } = scope;
  const effectiveBranchId = resolveEffectiveBranchId(scope);

  const where: Prisma.TaskWhereInput = {
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
          branch: { companyId },
        },
      },
    };
  }

  const role = (user?.role || '').toLowerCase();
  const isTeamMember = role === 'team_member' || role === 'team member';
  if (isTeamMember && user?.id) {
    where.assignedToId = user.id;
  }

  return where;
}

export function buildViolationCompanyWhere(
  scope: TenantListScope,
): Prisma.ComplianceViolationWhereInput {
  const { companyId } = scope;
  return companyId ? { companyId } : {};
}

/**
 * Builds branch-scoped violation filter (projects + tasks in branch).
 */
export async function buildBranchViolationWhere(
  prisma: { project: { findMany: any }; task: { findMany: any } },
  companyId: string,
  branchId: string,
): Promise<Prisma.ComplianceViolationWhereInput> {
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

  const projectIds = branchProjects.map((p: { id: string }) => p.id);
  const taskIds = branchTasks.map((t: { id: string }) => t.id);

  return {
    companyId,
    OR: [
      { entityType: 'Project', entityId: { in: projectIds } },
      { entityType: 'Task', entityId: { in: taskIds } },
    ],
  };
}

/**
 * Executive metrics — resolve branch filter from user + optional query.
 */
export function resolveMetricsBranchId(
  user: RequestUser | undefined,
  queryBranchId?: string,
): string | undefined {
  if (isBranchManager(user) && user?.scopeId) {
    return user.scopeId;
  }
  if (isCompanyOwner(user) && queryBranchId) {
    return queryBranchId;
  }
  return undefined;
}

/**
 * Ensures a Branch Manager can only act within their assigned branch.
 */
export function assertBranchManagerScope(
  user: RequestUser | undefined,
  branchId: string | null | undefined,
  action = 'access this resource',
): void {
  if (!isBranchManager(user) || !user?.scopeId) return;
  if (!branchId || branchId !== user.scopeId) {
    throw new ForbiddenException(
      `Branch Managers can only ${action} within their assigned branch.`,
    );
  }
}
