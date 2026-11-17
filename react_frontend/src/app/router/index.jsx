import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import PlatformLayout from '../../layouts/PlatformLayout';
import { ProtectedRoute, RoleRedirect } from '../guards';
import { ROLE_GROUPS } from '../../roles';
import { PATHS } from '../paths';

import { commonRoutes } from '../routes/common.jsx';
import { platformRoutes } from '../routes/platform.jsx';
import { executiveRoutes } from '../routes/executive.jsx';
import { complianceRoutes } from '../routes/compliance.jsx';
import { hrRoutes } from '../routes/hr.jsx';
import { processAdminRoutes } from '../routes/process-admin.jsx';
import { pmRoutes } from '../routes/pm.jsx';
import { teamLeadRoutes } from '../routes/team-lead.jsx';
import { memberRoutes } from '../routes/member.jsx';

const wrapSuspense = (routes) => 
  routes.map(r => ({ ...r, element: <Suspense fallback={<div>Loading...</div>}>{r.element}</Suspense> }));

// SEC-M2-17: each feature area is wrapped in its own role guard (see ROLE_GROUPS in roles.js).
// A signed-in user who types another area's URL is sent to /unauthorized instead of seeing the page.
const guarded = (allowedRoles, routes) => ({
  element: <ProtectedRoute allowedRoles={allowedRoles} />,
  children: wrapSuspense(routes),
});

export const router = createBrowserRouter([
  ...commonRoutes.filter(r => !r.path.startsWith('/profile') && !r.path.startsWith('/notifications') && r.path !== '*'),
  {
    path: '/',
    element: <RoleRedirect />
  },
  {
    element: <ProtectedRoute allowedRoles={ROLE_GROUPS.ALL_TENANT} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          ...wrapSuspense(commonRoutes.filter(r => r.path.startsWith('/profile') || r.path.startsWith('/notifications'))),
          guarded(ROLE_GROUPS.EXECUTIVE, executiveRoutes),
          guarded(ROLE_GROUPS.COMPLIANCE, complianceRoutes),
          guarded(ROLE_GROUPS.HR, hrRoutes.filter((r) => r.path !== PATHS.HR.TEAMS)),
          guarded(ROLE_GROUPS.HR_TEAMS, hrRoutes.filter((r) => r.path === PATHS.HR.TEAMS)),
          guarded(ROLE_GROUPS.PROCESS_ADMIN, processAdminRoutes),
          guarded(ROLE_GROUPS.PM, pmRoutes),
          guarded(ROLE_GROUPS.TEAM_LEAD, teamLeadRoutes),
          guarded(ROLE_GROUPS.MEMBER, memberRoutes)
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute allowedRoles={ROLE_GROUPS.PLATFORM} isPlatform={true} />,
    children: [
      {
        element: <PlatformLayout />,
        children: wrapSuspense(platformRoutes)
      }
    ]
  },
  {
    path: '*',
    element: <Suspense fallback={<div>Loading...</div>}>{commonRoutes.find(r => r.path === '*').element}</Suspense>
  }
]);
