import { PATHS } from '../../app/paths';
import { ROLES } from '../../roles';

// High-level visibility over organization metrics, projects, risk, people and billing.
// The executive is also the person who sets the company up, so the sidebar links to the
// organization pages the router already lets them open (HR, process templates, escalations).
// Items carry `roles` when only some executive roles may open them; the list mirrors ROLE_GROUPS.

const COMPLIANCE_PATHS = [
  PATHS.COMPLIANCE.VIOLATIONS,
  PATHS.COMPLIANCE.DASHBOARD,
  PATHS.COMPLIANCE.RULES,
  PATHS.COMPLIANCE.REPORTS,
  PATHS.COMPLIANCE.EVIDENCE,
];

const OWNER_ADMIN = [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN];

const EXECUTIVE_ITEMS = [
  { label: 'Executive Dashboard', path: PATHS.EXECUTIVE.DASHBOARD, icon: 'BarChart3' },
  { label: 'Portfolio Health', path: PATHS.EXECUTIVE.PORTFOLIO, icon: 'Activity' },
  {
    label: 'Projects Overview',
    path: PATHS.EXECUTIVE.PROJECTS,
    icon: 'FolderKanban',
    matchPaths: [PATHS.EXECUTIVE.PROJECTS],
  },
  { label: 'Escalations', path: PATHS.PM.ESCALATIONS, icon: 'Siren' },
  {
    label: 'Compliance & Risk',
    path: PATHS.COMPLIANCE.VIOLATIONS,
    icon: 'ShieldAlert',
    matchPaths: COMPLIANCE_PATHS,
  },
  { label: 'Employees', path: PATHS.EXECUTIVE.EMPLOYEES, icon: 'Users' },
  // Organization set-up (HR area): owner and system admin only, like ROLE_GROUPS.HR.
  {
    label: 'People & Roles',
    path: PATHS.HR.USERS,
    icon: 'UserCog',
    roles: OWNER_ADMIN,
    matchPaths: [PATHS.HR.USERS, PATHS.HR.ROLES, PATHS.HR.ROLE_ASSIGNMENTS],
  },
  { label: 'Branches', path: PATHS.HR.BRANCHES, icon: 'Building2', roles: OWNER_ADMIN },
  // Teams are readable by every executive role (ROLE_GROUPS.HR_TEAMS).
  { label: 'Teams', path: PATHS.HR.TEAMS, icon: 'Network' },
  {
    label: 'Process Templates',
    path: PATHS.PROCESS_ADMIN.TEMPLATES,
    icon: 'Workflow',
    roles: OWNER_ADMIN,
    matchPaths: [PATHS.PROCESS_ADMIN.TEMPLATES],
  },
  { label: 'Audit Logs', path: PATHS.EXECUTIVE.AUDIT_LOGS, icon: 'FileText' },
  { label: 'Billing & Plan', path: PATHS.EXECUTIVE.BILLING, icon: 'CreditCard', roles: OWNER_ADMIN },
];

/** Sidebar for one executive role: drops the items that role's route guard would refuse. */
export function getExecutiveNav(roleSlug) {
  return EXECUTIVE_ITEMS
    .filter((item) => !item.roles || item.roles.includes(roleSlug))
    .map(({ roles: _roles, ...item }) => item);
}

// Kept for existing imports: the full owner view.
export const executiveNav = getExecutiveNav(ROLES.COMPANY_OWNER);
