import { PATHS } from '../../app/paths';

// high-level visibility over organization metrics, projects, audit logs, and employees.
export const executiveNav = [
    { label: 'Executive Dashboard', path: PATHS.EXECUTIVE.DASHBOARD, icon: 'BarChart3' },
    { label: 'Projects Overview', path: PATHS.EXECUTIVE.PROJECTS, icon: 'FolderKanban' },
    {
      label: 'Compliance & Risk',
      path: PATHS.COMPLIANCE.VIOLATIONS,
      icon: 'ShieldAlert',
      matchPaths: [
        PATHS.COMPLIANCE.VIOLATIONS,
        PATHS.COMPLIANCE.DASHBOARD,
        PATHS.COMPLIANCE.RULES,
        PATHS.COMPLIANCE.REPORTS,
        PATHS.COMPLIANCE.EVIDENCE,
      ],
    },
    { label: 'Employees', path: PATHS.EXECUTIVE.EMPLOYEES, icon: 'Users' },
    { label: 'Audit Logs', path: PATHS.EXECUTIVE.AUDIT_LOGS, icon: 'FileText' },
    { label: 'Billing & Plan', path: PATHS.EXECUTIVE.BILLING, icon: 'CreditCard' },
];
