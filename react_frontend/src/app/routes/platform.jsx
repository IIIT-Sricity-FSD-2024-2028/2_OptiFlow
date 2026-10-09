import React from 'react';
import { PATHS } from '../paths';
const PlatformDashboard = React.lazy(() => import('../../features/platform/pages/Dashboard'));
const PlatformCompanies = React.lazy(() => import('../../features/platform/pages/Companies'));
const PlatformPlans = React.lazy(() => import('../../features/platform/pages/Plans'));
const PlatformSubscriptions = React.lazy(() => import('../../features/platform/pages/Subscriptions'));
const PlatformAdminUsers = React.lazy(() => import('../../features/platform/pages/AdminUsers'));
const PlatformSupportAccess = React.lazy(() => import('../../features/platform/pages/SupportAccess'));

export const platformRoutes = [
  { path: PATHS.PLATFORM.DASHBOARD, element: <PlatformDashboard /> },
  { path: PATHS.PLATFORM.COMPANIES, element: <PlatformCompanies /> },
  { path: PATHS.PLATFORM.PLANS, element: <PlatformPlans /> },
  { path: PATHS.PLATFORM.SUBSCRIPTIONS, element: <PlatformSubscriptions /> },
  { path: PATHS.PLATFORM.ADMIN_USERS, element: <PlatformAdminUsers /> },
  { path: PATHS.PLATFORM.SUPPORT_ACCESS, element: <PlatformSupportAccess /> }
];
