import React from 'react';
import { PATHS } from '../paths';
const ComplianceDashboard = React.lazy(() => import('../../features/compliance/pages/Dashboard'));
const ComplianceRules = React.lazy(() => import('../../features/compliance/pages/Rules'));
const ComplianceRuleDetail = React.lazy(() => import('../../features/compliance/pages/RuleDetail'));
const ComplianceCategories = React.lazy(() => import('../../features/compliance/pages/Categories'));
const ComplianceBindings = React.lazy(() => import('../../features/compliance/pages/Bindings'));
const ComplianceViolations = React.lazy(() => import('../../features/compliance/pages/Violations'));
const ComplianceEvidence = React.lazy(() => import('../../features/compliance/pages/Evidence'));
const ComplianceAuditLogs = React.lazy(() => import('../../features/compliance/pages/AuditLogs'));

export const complianceRoutes = [
  { path: PATHS.COMPLIANCE.DASHBOARD, element: <ComplianceDashboard /> },
  { path: PATHS.COMPLIANCE.RULES, element: <ComplianceRules /> },
  { path: PATHS.COMPLIANCE.RULE_DETAIL, element: <ComplianceRuleDetail /> },
  { path: PATHS.COMPLIANCE.CATEGORIES, element: <ComplianceCategories /> },
  { path: PATHS.COMPLIANCE.BINDINGS, element: <ComplianceBindings /> },
  { path: PATHS.COMPLIANCE.VIOLATIONS, element: <ComplianceViolations /> },
  { path: PATHS.COMPLIANCE.EVIDENCE, element: <ComplianceEvidence /> },
  { path: PATHS.COMPLIANCE.AUDIT_LOGS, element: <ComplianceAuditLogs /> }
];
