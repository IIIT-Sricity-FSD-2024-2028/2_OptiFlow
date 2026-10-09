import { PATHS } from '../../app/paths';

// manages company users, role assignments, branches, and team hierarchies.
export const hrNav = [
    { label: 'HR Dashboard', path: PATHS.HR.DASHBOARD, icon: 'Users' },
    { label: 'User Directory', path: PATHS.HR.USERS, icon: 'UserCheck' },
    { label: 'Roles & Permissions', path: PATHS.HR.ROLES, icon: 'Key' },
    { label: 'Role Assignments', path: PATHS.HR.ROLE_ASSIGNMENTS, icon: 'UserCog' },
    { label: 'Branches', path: PATHS.HR.BRANCHES, icon: 'Building' },
    { label: 'Teams', path: PATHS.HR.TEAMS, icon: 'Network' },
];
