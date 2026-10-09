import React from 'react';
import { PATHS } from '../paths';
const HrDashboard = React.lazy(() => import('../../features/hr/pages/Dashboard'));
const HrUsers = React.lazy(() => import('../../features/hr/pages/Users'));
const HrUserDetail = React.lazy(() => import('../../features/hr/pages/UserDetail'));
const HrRoles = React.lazy(() => import('../../features/hr/pages/Roles'));
const HrRoleAssignments = React.lazy(() => import('../../features/hr/pages/RoleAssignments'));
const HrBranches = React.lazy(() => import('../../features/hr/pages/Branches'));
const HrTeams = React.lazy(() => import('../../features/hr/pages/Teams'));

export const hrRoutes = [
  { path: PATHS.HR.DASHBOARD, element: <HrDashboard /> },
  { path: PATHS.HR.USERS, element: <HrUsers /> },
  { path: PATHS.HR.USER_DETAIL, element: <HrUserDetail /> },
  { path: PATHS.HR.ROLES, element: <HrRoles /> },
  { path: PATHS.HR.ROLE_ASSIGNMENTS, element: <HrRoleAssignments /> },
  { path: PATHS.HR.BRANCHES, element: <HrBranches /> },
  { path: PATHS.HR.TEAMS, element: <HrTeams /> }
];
