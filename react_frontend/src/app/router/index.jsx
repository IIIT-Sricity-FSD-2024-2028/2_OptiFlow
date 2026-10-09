import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import PlatformLayout from '../../layouts/PlatformLayout';
import { ProtectedRoute, RoleRedirect } from '../guards';

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

export const router = createBrowserRouter([
  ...commonRoutes.filter(r => !r.path.startsWith('/profile') && !r.path.startsWith('/notifications') && r.path !== '*'),
  {
    path: '/',
    element: <RoleRedirect />
  },
  {
    element: <ProtectedRoute allowedRoles={['system_admin', 'company_owner', 'hr_manager', 'process_admin', 'compliance_officer', 'project_manager', 'team_leader', 'team_member']} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          ...wrapSuspense(commonRoutes.filter(r => r.path.startsWith('/profile') || r.path.startsWith('/notifications'))),
          ...wrapSuspense(executiveRoutes),
          ...wrapSuspense(complianceRoutes),
          ...wrapSuspense(hrRoutes),
          ...wrapSuspense(processAdminRoutes),
          ...wrapSuspense(pmRoutes),
          ...wrapSuspense(teamLeadRoutes),
          ...wrapSuspense(memberRoutes)
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute allowedRoles={['system_admin', 'platform_admin']} isPlatform={true} />,
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
