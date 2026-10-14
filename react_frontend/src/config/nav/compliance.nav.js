import { PATHS } from '../../app/paths';

// rules, categories, bindings, track violations, and audit evidence.
export const complianceNav = [
  { label: 'Dashboard', path: PATHS.COMPLIANCE.DASHBOARD, icon: 'LayoutDashboard' },
  { 
    label: 'Rules & Policies', 
    path: PATHS.COMPLIANCE.RULES, 
    icon: 'BookOpen',
    matchPaths: [
      PATHS.COMPLIANCE.RULES,
      PATHS.COMPLIANCE.CATEGORIES,
      PATHS.COMPLIANCE.BINDINGS,
    ],
  },
  { label: 'Violations', path: PATHS.COMPLIANCE.VIOLATIONS, icon: 'AlertTriangle' },
  { label: 'Evidence Review', path: PATHS.COMPLIANCE.EVIDENCE, icon: 'FileCheck' },
  { 
    label: 'Reports & Audit', 
    path: PATHS.COMPLIANCE.AUDIT_LOGS, 
    icon: 'FileText',
    matchPaths: [
      PATHS.COMPLIANCE.AUDIT_LOGS,
      PATHS.COMPLIANCE.REPORTS,
    ],
  },
];
