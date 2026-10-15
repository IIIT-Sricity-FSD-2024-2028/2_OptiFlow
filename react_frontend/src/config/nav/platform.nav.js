import { PATHS } from '../../app/paths';

//this is done to support cross-tenant infra.

export const platformNav = [
    { label: 'Dashboard', path: PATHS.PLATFORM.DASHBOARD, icon: 'LayoutDashboard' },
    { label: 'Companies', path: PATHS.PLATFORM.COMPANIES, icon: 'Building2' },
    { label: 'Plans', path: PATHS.PLATFORM.PLANS, icon: 'CreditCard' },
    { label: 'Subscriptions', path: PATHS.PLATFORM.SUBSCRIPTIONS, icon: 'Receipt' },
    { label: 'Audit Log', path: PATHS.PLATFORM.AUDIT_LOGS, icon: 'FileText' },
];