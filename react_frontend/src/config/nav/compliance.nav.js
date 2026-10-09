import { PATHS } from '../../app/paths';

// rules, categories, bindings, track violations, and audit evidence.
export const complianceNav = [
    { label: 'Dashboard', path: PATHS.COMPLIANCE.DASHBOARD, icon: 'LayoutDashboard' },
    { label: 'Rules', path: PATHS.COMPLIANCE.RULES, icon: 'BookOpen' },
    { label: 'Categories', path: PATHS.COMPLIANCE.CATEGORIES, icon: 'Tags' },
    { label: 'Scope Bindings', path: PATHS.COMPLIANCE.BINDINGS, icon: 'Link2' },
    { label: 'Violations', path: PATHS.COMPLIANCE.VIOLATIONS, icon: 'AlertTriangle' },
    { label: 'Evidence Review', path: PATHS.COMPLIANCE.EVIDENCE, icon: 'FileCheck' },
    { label: 'Audit Trail', path: PATHS.COMPLIANCE.AUDIT_LOGS, icon: 'History' },
];
