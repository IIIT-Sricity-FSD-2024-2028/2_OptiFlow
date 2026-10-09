import React from 'react';
import { PATHS } from '../paths';
const TeamLeadDashboard = React.lazy(() => import('../../features/work/team-lead/pages/Dashboard'));
const TeamLeadTasks = React.lazy(() => import('../../features/work/team-lead/pages/Tasks'));
const TeamLeadTaskDetail = React.lazy(() => import('../../features/work/team-lead/pages/TaskDetail'));
const TeamLeadReviews = React.lazy(() => import('../../features/work/team-lead/pages/Reviews'));
const TeamLeadEscalations = React.lazy(() => import('../../features/work/team-lead/pages/Escalations'));

export const teamLeadRoutes = [
  { path: PATHS.TEAM_LEAD.DASHBOARD, element: <TeamLeadDashboard /> },
  { path: PATHS.TEAM_LEAD.TASKS, element: <TeamLeadTasks /> },
  { path: PATHS.TEAM_LEAD.TASK_DETAIL, element: <TeamLeadTaskDetail /> },
  { path: PATHS.TEAM_LEAD.REVIEWS, element: <TeamLeadReviews /> },
  { path: PATHS.TEAM_LEAD.ESCALATIONS, element: <TeamLeadEscalations /> }
];
