import React from 'react';
import { Navigate } from 'react-router-dom';
import { PATHS } from '../paths';
const PlatformDashboard = React.lazy(() => import('../../features/platform/pages/Dashboard'));
const PlatformCompanies = React.lazy(() => import('../../features/platform/pages/Companies'));
const PlatformCompanyProvision = React.lazy(() => import('../../features/platform/pages/CompanyProvision'));
const PlatformCompanyDetail = React.lazy(() => import('../../features/platform/pages/CompanyDetail'));
const PlatformPlans = React.lazy(() => import('../../features/platform/pages/Plans'));
const PlatformSubscriptions = React.lazy(() => import('../../features/platform/pages/Subscriptions'));
const PlatformAuditLogs = React.lazy(() => import('../../features/platform/pages/AuditLogs'));
const Profile = React.lazy(() => import('../../features/common/pages/Profile'));

export const platformRoutes = [
  { path: PATHS.PLATFORM.DASHBOARD, element: <PlatformDashboard /> },
  { path: PATHS.PLATFORM.COMPANIES, element: <PlatformCompanies /> },
  { path: PATHS.PLATFORM.COMPANY_NEW, element: <PlatformCompanyProvision /> },
  { path: PATHS.PLATFORM.COMPANY_DETAIL, element: <PlatformCompanyDetail /> },
  { path: PATHS.PLATFORM.PLANS, element: <PlatformPlans /> },
  { path: PATHS.PLATFORM.SUBSCRIPTIONS, element: <PlatformSubscriptions /> },
  { path: PATHS.PLATFORM.ADMIN_USERS, element: <Navigate to={PATHS.PLATFORM.DASHBOARD} replace /> },
  { path: PATHS.PLATFORM.SUPPORT_ACCESS, element: <Navigate to={PATHS.PLATFORM.DASHBOARD} replace /> },
  { path: PATHS.PLATFORM.AUDIT_LOGS, element: <PlatformAuditLogs /> },
  { path: '/platform/audit-log', element: <PlatformAuditLogs /> },
  { path: PATHS.PLATFORM.PROFILE, element: <Profile /> },
];
