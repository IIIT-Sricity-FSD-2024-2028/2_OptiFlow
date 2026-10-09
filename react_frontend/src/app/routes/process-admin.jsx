import React from 'react';
import { PATHS } from '../paths';
const ProcessAdminDashboard = React.lazy(() => import('../../features/process-admin/pages/Dashboard'));
const ProcessAdminTemplates = React.lazy(() => import('../../features/process-admin/pages/Templates'));
const ProcessAdminTemplateDetail = React.lazy(() => import('../../features/process-admin/pages/TemplateDetail'));
const ProcessAdminInstances = React.lazy(() => import('../../features/process-admin/pages/Instances'));
const ProcessAdminInstanceDetail = React.lazy(() => import('../../features/process-admin/pages/InstanceDetail'));

export const processAdminRoutes = [
  { path: PATHS.PROCESS_ADMIN.DASHBOARD, element: <ProcessAdminDashboard /> },
  { path: PATHS.PROCESS_ADMIN.TEMPLATES, element: <ProcessAdminTemplates /> },
  { path: PATHS.PROCESS_ADMIN.TEMPLATE_DETAIL, element: <ProcessAdminTemplateDetail /> },
  { path: PATHS.PROCESS_ADMIN.INSTANCES, element: <ProcessAdminInstances /> },
  { path: PATHS.PROCESS_ADMIN.INSTANCE_DETAIL, element: <ProcessAdminInstanceDetail /> }
];
