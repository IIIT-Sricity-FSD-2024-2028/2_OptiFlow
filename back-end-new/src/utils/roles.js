/**
 * Canonical System Roles and Slugs
 * Based on Prisma RoleTemplate labels and system defaults.
 */
const ROLE_LABELS = {
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

/**
 * Reading a role constant that does not exist (for example ROLES.SUPERUSER) used to give
 * `undefined`, which silently never matches in a role check. It now throws at module load
 * (route files build their role lists at startup), so a typo stops the server instead of
 * leaving a gate that nobody can pass or, worse, a gate that quietly ignores a role.
 */
export const ROLES = new Proxy(Object.freeze(ROLE_LABELS), {
  get(target, prop, receiver) {
    if (typeof prop === 'symbol' || prop in target) return Reflect.get(target, prop, receiver);
    if (prop === 'toJSON' || prop === 'then') return undefined;
    throw new Error(`Unknown role constant ROLES.${String(prop)}. Defined: ${Object.keys(target).join(', ')}`);
  },
});

export const ROLE_SLUGS = {
  platform_admin: ROLES.PLATFORM_ADMIN,
  system_admin: ROLES.SYSTEM_ADMIN,
  company_owner: ROLES.COMPANY_OWNER,
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
  if (!userRoleLabelOrSlug || !allowedRoles) {
    return false;
  }

  const flatAllowed = (Array.isArray(allowedRoles) ? allowedRoles.flat(Infinity) : [allowedRoles]).filter(Boolean);
  if (flatAllowed.length === 0) {
    return false;
  }

  const userCanonical = toCanonicalRole(userRoleLabelOrSlug);
  const userNorm = normalizeRole(userRoleLabelOrSlug);

  return flatAllowed.some((allowed) => {
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



/**
 * Role resolution (decision D-S1).
 *
 * A user's role is decided only by *which system role template* an active assignment points at,
 * never by what a role is called. Custom roles (isSystem = false) carry permissions only and are
 * treated as Team Member for data scope. Anyone able to create a role can pick any label, so a label
 * must never grant access.
 */

// Template slug -> the role slug the API and the frontend use.
const TEMPLATE_TO_SLUG = {
  system_admin: 'system_admin',
  company_owner: 'company_owner',
  branch_manager: 'branch_manager',
  access_governance: 'hr_manager',
  process_admin: 'process_admin',
  compliance_officer: 'compliance_officer',
  project_manager: 'project_manager',
  team_lead: 'team_leader',
  team_member: 'team_member',
};

// Highest first: when a user holds several roles, the first match here wins.
const SLUG_PRECEDENCE = [
  'system_admin',
  'company_owner',
  'branch_manager',
  'hr_manager',
  'process_admin',
  'compliance_officer',
  'project_manager',
  'team_leader',
  'team_member',
];

/** Slug of one role row, or null when it is a custom (non-system) role. */
export function systemSlugOfRole(role) {
  if (!role || role.isSystem !== true) return null;
  const templateSlug = role.roleTemplate?.slug || role.name || '';
  return TEMPLATE_TO_SLUG[templateSlug] || null;
}

/** Names a custom role may not use because they are, or look like, system role names. */
const RESERVED_ALIASES = ['owner', 'superuser', 'ceo', 'cto', 'coo', 'admin', 'administrator', 'platform_admin', 'hr', 'pm', 'tl'];

export function isReservedRoleName(label) {
  const norm = normalizeRole(label);
  if (!norm) return false;
  if (RESERVED_ALIASES.includes(norm)) return true;
  if (TEMPLATE_TO_SLUG[norm] || SLUG_PRECEDENCE.includes(norm)) return true;
  return Object.values(ROLES).some((l) => normalizeRole(l) === norm);
}

/**
 * Resolves the effective role of a user from their role assignments.
 * Only active (not revoked) assignments count.
 * Returns { roleLabel, roleSlug, matchedAssignment }.
 */
export function resolveUserRole(user) {
  const active = (user?.roleAssignments || []).filter((ra) => ra.role && !ra.revokedAt);

  let best = null;
  let bestRank = Infinity;
  for (const ra of active) {
    const slug = systemSlugOfRole(ra.role);
    const rank = slug ? SLUG_PRECEDENCE.indexOf(slug) : SLUG_PRECEDENCE.length;
    if (rank < bestRank) {
      best = ra;
      bestRank = rank;
    }
  }

  if (!best) {
    return { roleLabel: 'Team Member', roleSlug: 'team_member', matchedAssignment: null };
  }
  return {
    roleLabel: best.role.label || 'Team Member',
    roleSlug: systemSlugOfRole(best.role) || 'team_member',
    matchedAssignment: best,
  };
}
