import { prisma } from '../config/prisma.js';
import { BadRequestError, ForbiddenError } from './errors.js';
import { normalizeRole, systemSlugOfRole } from './roles.js';

export const SCOPE_TYPES = ['Company', 'Branch', 'Team', 'Project'];

/** Role include that lets systemSlugOfRole resolve by template slug, not by label (D-S1). */
export const ROLE_WITH_TEMPLATE = { include: { roleTemplate: { select: { slug: true } } } };

/** Prisma filter for a system Company Owner role, matched by template slug or system name. */
export const OWNER_ROLE_WHERE = {
  isSystem: true,
  OR: [{ roleTemplate: { slug: 'company_owner' } }, { name: 'company_owner' }],
};

/**
 * Checks that (scopeType, scopeId) names a real row of the given company (SEC-M5-08).
 * Throws BadRequestError otherwise.
 */
export async function assertValidScope({ companyId, scopeType, scopeId, client = prisma }) {
  if (!SCOPE_TYPES.includes(scopeType)) {
    throw new BadRequestError(`scopeType must be one of ${SCOPE_TYPES.join(', ')}`);
  }
  const id = String(scopeId || '');
  if (!id) throw new BadRequestError('scopeId is required');

  let found = null;
  if (scopeType === 'Company') {
    found = id === companyId ? { id } : null;
  } else if (scopeType === 'Branch') {
    found = await client.branch.findFirst({ where: { id, companyId }, select: { id: true } });
  } else if (scopeType === 'Team') {
    found = await client.team.findFirst({ where: { id, branch: { companyId } }, select: { id: true } });
  } else if (scopeType === 'Project') {
    found = await client.project.findFirst({ where: { id, companyId, deletedAt: null }, select: { id: true } });
  }

  if (!found) {
    throw new BadRequestError(`${scopeType} ${id} does not exist in this company`);
  }
}

/** Login slugs whose access is company-wide by definition: always Company-scoped. */
export const COMPANY_WIDE_SLUGS = ['company_owner', 'system_admin'];

/**
 * Checks that a scope type fits the role (SEC-M5-08): Company Owner and System Admin are
 * company-wide, a Branch Manager works on one branch. Other roles accept any valid scope.
 * Throws BadRequestError otherwise. Shared by POST/PATCH /users and POST /role-assignments.
 */
export function assertScopeFitsRole(role, scopeType) {
  const slug = systemSlugOfRole(role);
  if (COMPANY_WIDE_SLUGS.includes(slug) && scopeType !== 'Company') {
    throw new BadRequestError(`${role.label} is a company-wide role: use scopeType Company`);
  }
  if (slug === 'branch_manager' && scopeType !== 'Branch') {
    throw new BadRequestError('A Branch Manager must be assigned to a branch: use scopeType Branch with the branch id');
  }
}

/** Number of distinct active users holding an active Company Owner assignment in the company. */
export async function countActiveOwners(companyId, client = prisma) {
  const rows = await client.roleAssignment.findMany({
    where: {
      revokedAt: null,
      user: { companyId, isActive: true },
      role: { companyId, ...OWNER_ROLE_WHERE },
    },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.length;
}

/**
 * Owner/System Admin grant rules, checked inside the company lock (pass the lock's tx as client).
 * - A System Admin may grant Company Owner only while the company has no active owner. Sign-up
 *   creates a System Admin, not an owner, so this is how such a company gets its first owner (F1).
 * - Nobody may hold both roles: system_admin outranks company_owner when a user's role is
 *   resolved, so the pair would silently strip the owner's rights (A1).
 * ignoreAssignmentId: a row the same change revokes (a PATCH replacing the primary role).
 */
export async function assertOwnerAdminGrantRules({ companyId, callerRole, userId, grantingSlug, ignoreAssignmentId = null, client = prisma }) {
  if (grantingSlug !== 'company_owner' && grantingSlug !== 'system_admin') return;

  if (grantingSlug === 'company_owner' && callerRole !== 'company_owner' && (await countActiveOwners(companyId, client)) > 0) {
    throw new ForbiddenError('Only a Company Owner can assign the Company Owner role');
  }

  const otherSlug = grantingSlug === 'company_owner' ? 'system_admin' : 'company_owner';
  const held = await client.roleAssignment.findMany({
    where: { companyId, userId, revokedAt: null, ...(ignoreAssignmentId ? { NOT: { id: ignoreAssignmentId } } : {}) },
    include: { role: ROLE_WITH_TEMPLATE },
  });
  if (held.some((ra) => systemSlugOfRole(ra.role) === otherSlug)) {
    throw new ForbiddenError('A user cannot hold both the Company Owner and System Admin roles');
  }
}

/**
 * Old spellings of the login role slugs, accepted only so older clients and stored data keep
 * working (PRE-M5-05). New code sends the login slugs: company_owner, system_admin,
 * branch_manager, hr_manager, process_admin, compliance_officer, project_manager,
 * team_leader, team_member.
 */
const LEGACY_SLUG_ALIASES = {
  team_lead: 'team_leader',
  lead: 'team_leader',
  access_governance: 'hr_manager',
  pm: 'project_manager',
  member: 'team_member',
};

/**
 * Finds the company role a request means, from a role id, a login slug, or (custom roles only)
 * a label. System roles are matched by their template slug first, so renaming a system role's
 * label can never make a request resolve to a different system role (D-S1).
 */
export function resolveCompanyRole(roles, requested) {
  if (!requested) return null;
  const raw = String(requested);
  const byId = roles.find((r) => r.id === raw);
  if (byId) return byId;

  const norm = normalizeRole(raw);
  const slug = LEGACY_SLUG_ALIASES[norm] || norm;
  const bySlug = roles.find((r) => systemSlugOfRole(r) === slug);
  if (bySlug) return bySlug;

  return roles.find((r) => !r.isSystem && normalizeRole(r.label) === norm) || null;
}
