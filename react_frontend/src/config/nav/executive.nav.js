import { PATHS } from '../../app/paths';

// high-level visibility over organization metrics, projects, and audit logs.
export const executiveNav = [
    { label: 'Executive Dashboard', path: PATHS.EXECUTIVE.DASHBOARD, icon: 'BarChart3' },
    { label: 'Projects Overview', path: PATHS.EXECUTIVE.PROJECTS, icon: 'FolderKanban' },
    { label: 'Audit Logs', path: PATHS.EXECUTIVE.AUDIT_LOGS, icon: 'FileText' },
];
