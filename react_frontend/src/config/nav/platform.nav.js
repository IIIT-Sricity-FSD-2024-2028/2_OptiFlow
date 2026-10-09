import { PATHS } from '../../app/paths';

//this is done to support cross-tenant infra.

export const platformNav = [
    { label: 'Dashboard', path: PATHS.PLATFORM.DASHBOARD, icon: 'LayoutDashboard' },
    { label: 'Companies', path: PATHS.PLATFORM.COMPANIES, icon: 'Building2' },
    { label: 'Plans', path: PATHS.PLATFORM.PLANS, icon: 'CreditCard' },
    { label: 'Subscriptions', path: PATHS.PLATFORM.SUBSCRIPTIONS, icon: 'Receipt' },
    { label: 'Admin Users', path: PATHS.PLATFORM.ADMIN_USERS, icon: 'ShieldCheck' },
    { label: 'Support Access', path: PATHS.PLATFORM.SUPPORT_ACCESS, icon: 'LifeBuoy' },
];