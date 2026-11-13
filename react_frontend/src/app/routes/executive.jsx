import React from 'react';
import { PATHS } from '../paths';
const ExecutiveDashboard = React.lazy(() => import('../../features/executive/pages/Dashboard'));
const ExecutiveProjects = React.lazy(() => import('../../features/executive/pages/Projects'));
const ExecutiveProjectDetail = React.lazy(() => import('../../features/executive/pages/ProjectDetail'));
const ExecutiveEmployees = React.lazy(() => import('../../features/executive/pages/Employees'));
const ExecutiveAuditLogs = React.lazy(() => import('../../features/executive/pages/AuditLogs'));
const ExecutiveBilling = React.lazy(() => import('../../features/executive/pages/Billing'));

export const executiveRoutes = [
  { path: PATHS.EXECUTIVE.DASHBOARD, element: <ExecutiveDashboard /> },
  { path: PATHS.EXECUTIVE.PROJECTS, element: <ExecutiveProjects /> },
  { path: PATHS.EXECUTIVE.PROJECT_DETAIL, element: <ExecutiveProjectDetail /> },
  { path: PATHS.EXECUTIVE.EMPLOYEES, element: <ExecutiveEmployees /> },
  { path: PATHS.EXECUTIVE.AUDIT_LOGS, element: <ExecutiveAuditLogs /> },
  { path: PATHS.EXECUTIVE.BILLING, element: <ExecutiveBilling /> },
];

