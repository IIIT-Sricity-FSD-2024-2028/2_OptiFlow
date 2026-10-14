import { PATHS } from '../../app/paths';

// Manages company users, role assignments, branches, and team hierarchies.
export const hrNav = [
    { label: 'HR Dashboard', path: PATHS.HR.DASHBOARD, icon: 'Users' },
    { label: 'Users & Access', path: PATHS.HR.USERS, icon: 'UserCheck' },
    { label: 'Roles & Permissions', path: PATHS.HR.ROLES, icon: 'Key' },
    { label: 'Branches', path: PATHS.HR.BRANCHES, icon: 'Building' },
    { label: 'Org Chart & Teams', path: PATHS.HR.TEAMS, icon: 'Network' },
];
