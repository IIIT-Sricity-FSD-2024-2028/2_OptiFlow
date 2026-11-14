export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  SYSTEM_ADMIN: 'system_admin',
  COMPANY_OWNER: 'company_owner',
  BRANCH_MANAGER: 'branch_manager',
  HR_MANAGER: 'hr_manager',
  PROCESS_ADMIN: 'process_admin',
  COMPLIANCE_OFFICER: 'compliance_officer',
  PROJECT_MANAGER: 'project_manager',
  TEAM_LEADER: 'team_leader',
  TEAM_MEMBER: 'team_member',
};

// WHY: One place that says which tenant roles may open which feature area. The router guards use
// these groups instead of one list that lets every role into every page. They mirror the API gates
// (backend requireRoles lists); the API stays the real protection, the UI just stops showing pages
// the API would refuse.
const EXECUTIVES = [ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.BRANCH_MANAGER];

export const ROLE_GROUPS = {
  // Any signed-in company user (profile, notifications).
  ALL_TENANT: [
    ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.BRANCH_MANAGER, ROLES.HR_MANAGER,
    ROLES.PROCESS_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEADER,
    ROLES.TEAM_MEMBER,
  ],
  EXECUTIVE: EXECUTIVES,
  // Executives see compliance violations/rules from their dashboard.
  COMPLIANCE: [ROLES.COMPLIANCE_OFFICER, ...EXECUTIVES],
  // Users, roles, assignments, branches are owner / system admin / HR in the API.
  HR: [ROLES.HR_MANAGER, ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER],
  // The teams API also allows branch managers to read.
  HR_TEAMS: [ROLES.HR_MANAGER, ...EXECUTIVES],
  PROCESS_ADMIN: [ROLES.PROCESS_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER],
  // Executives open PM escalations from their dashboard.
  PM: [ROLES.PROJECT_MANAGER, ...EXECUTIVES],
  TEAM_LEAD: [ROLES.TEAM_LEADER],
  MEMBER: [ROLES.TEAM_MEMBER],
  PLATFORM: [ROLES.PLATFORM_ADMIN],
};
