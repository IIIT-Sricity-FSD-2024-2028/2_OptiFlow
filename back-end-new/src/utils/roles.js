/**
 * Canonical System Roles and Slugs
 * Based on Prisma RoleTemplate labels and system defaults.
 */
export const ROLES = {
  PLATFORM_ADMIN: 'Platform Admin',
  SYSTEM_ADMIN: 'System Admin',
  COMPANY_OWNER: 'Company Owner',
  BRANCH_MANAGER: 'Branch Manager',
  ACCESS_GOVERNANCE: 'Access Governance',
  PROCESS_ADMIN: 'Process Admin',
  PROJECT_MANAGER: 'Project Manager',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  TEAM_LEAD: 'Team Lead',
  TEAM_LEADER: 'Team Lead',
  TEAM_MEMBER: 'Team Member',
};

export const ROLE_SLUGS = {
  platform_admin: ROLES.PLATFORM_ADMIN,
  system_admin: ROLES.SYSTEM_ADMIN,
  company_owner: ROLES.COMPANY_OWNER,
  superuser: ROLES.COMPANY_OWNER,
  owner: ROLES.COMPANY_OWNER,
  ceo: ROLES.COMPANY_OWNER,
  cto: ROLES.COMPANY_OWNER,
  coo: ROLES.COMPANY_OWNER,
  branch_manager: ROLES.BRANCH_MANAGER,
  access_governance: ROLES.ACCESS_GOVERNANCE,
  hr_manager: ROLES.ACCESS_GOVERNANCE,
  process_admin: ROLES.PROCESS_ADMIN,
  project_manager: ROLES.PROJECT_MANAGER,
  pm: ROLES.PROJECT_MANAGER,
  compliance_officer: ROLES.COMPLIANCE_OFFICER,
  team_lead: ROLES.TEAM_LEAD,
  team_leader: ROLES.TEAM_LEAD,
  lead: ROLES.TEAM_LEAD,
  team_member: ROLES.TEAM_MEMBER,
  member: ROLES.TEAM_MEMBER,
};

/**
 * Normalizes a role label or slug string to lowercase trimmed format
 */
export function normalizeRole(roleString) {
  if (!roleString || typeof roleString !== 'string') return '';
  return roleString.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

/**
 * Resolves a role string/slug to its canonical system role label
 */
export function toCanonicalRole(roleString) {
  if (!roleString || typeof roleString !== 'string') return '';
  const norm = normalizeRole(roleString);
  if (ROLE_SLUGS[norm]) return ROLE_SLUGS[norm];

  // Check if matches an existing canonical role label directly
  for (const label of Object.values(ROLES)) {
    if (normalizeRole(label) === norm) {
      return label;
    }
  }

  return '';
}

/**
 * Checks if a user has any of the required roles (supports both canonical labels and slugs)
 * Strict comparison - no substring/fuzzy matching to prevent accidental privilege escalation.
 */
export function hasRole(userRoleLabelOrSlug, allowedRoles = []) {
  if (!userRoleLabelOrSlug || !allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return false;
  }

  const userCanonical = toCanonicalRole(userRoleLabelOrSlug);
  const userNorm = normalizeRole(userRoleLabelOrSlug);

  return allowedRoles.some((allowed) => {
    if (!allowed) return false;
    const allowedCanonical = toCanonicalRole(allowed);
    const allowedNorm = normalizeRole(allowed);

    // 1. Direct canonical label match (e.g. "Company Owner" === "Company Owner")
    if (userCanonical && allowedCanonical && userCanonical === allowedCanonical) {
      return true;
    }

    // 2. Direct normalized slug match (e.g. "superuser" === "superuser" or "pm" === "pm")
    if (userNorm && allowedNorm && userNorm === allowedNorm) {
      return true;
    }

    return false;
  });
}

