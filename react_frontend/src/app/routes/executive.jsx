import React from 'react';
import { PATHS } from '../paths';
const ExecutiveDashboard = React.lazy(() => import('../../features/executive/pages/Dashboard'));
const ExecutiveProjects = React.lazy(() => import('../../features/executive/pages/Projects'));
const ExecutiveAuditLogs = React.lazy(() => import('../../features/executive/pages/AuditLogs'));

export const executiveRoutes = [
  { path: PATHS.EXECUTIVE.DASHBOARD, element: <ExecutiveDashboard /> },
  { path: PATHS.EXECUTIVE.PROJECTS, element: <ExecutiveProjects /> },
  { path: PATHS.EXECUTIVE.AUDIT_LOGS, element: <ExecutiveAuditLogs /> }
];
