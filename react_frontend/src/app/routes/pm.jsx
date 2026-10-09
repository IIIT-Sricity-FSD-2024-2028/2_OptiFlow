import React from 'react';
import { PATHS } from '../paths';
const PmDashboard = React.lazy(() => import('../../features/work/pm/pages/Dashboard'));
const PmProjects = React.lazy(() => import('../../features/work/pm/pages/Projects'));
const PmProjectDetail = React.lazy(() => import('../../features/work/pm/pages/ProjectDetail'));
const PmTasks = React.lazy(() => import('../../features/work/pm/pages/Tasks'));
const PmTaskDetail = React.lazy(() => import('../../features/work/pm/pages/TaskDetail'));
const PmEscalations = React.lazy(() => import('../../features/work/pm/pages/Escalations'));

export const pmRoutes = [
  { path: PATHS.PM.DASHBOARD, element: <PmDashboard /> },
  { path: PATHS.PM.PROJECTS, element: <PmProjects /> },
  { path: PATHS.PM.PROJECT_DETAIL, element: <PmProjectDetail /> },
  { path: PATHS.PM.TASKS, element: <PmTasks /> },
  { path: PATHS.PM.TASK_DETAIL, element: <PmTaskDetail /> },
  { path: PATHS.PM.ESCALATIONS, element: <PmEscalations /> }
];
