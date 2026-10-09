import React from 'react';
import { PATHS } from '../paths';
const MemberDashboard = React.lazy(() => import('../../features/work/member/pages/Dashboard'));
const MemberTasks = React.lazy(() => import('../../features/work/member/pages/Tasks'));
const MemberTaskDetail = React.lazy(() => import('../../features/work/member/pages/TaskDetail'));
const MemberEvidence = React.lazy(() => import('../../features/work/member/pages/Evidence'));
const MemberEscalations = React.lazy(() => import('../../features/work/member/pages/Escalations'));

export const memberRoutes = [
  { path: PATHS.MEMBER.DASHBOARD, element: <MemberDashboard /> },
  { path: PATHS.MEMBER.TASKS, element: <MemberTasks /> },
  { path: PATHS.MEMBER.TASK_DETAIL, element: <MemberTaskDetail /> },
  { path: PATHS.MEMBER.EVIDENCE, element: <MemberEvidence /> },
  { path: PATHS.MEMBER.ESCALATIONS, element: <MemberEscalations /> }
];
