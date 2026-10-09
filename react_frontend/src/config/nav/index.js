import { ROLES } from '../../roles';
import { platformNav } from './platform.nav';
import { executiveNav } from './executive.nav';
import { complianceNav } from './compliance.nav';
import { hrNav } from './hr.nav';
import { processAdminNav } from './process-admin.nav';
import { pmNav } from './pm.nav';
import { teamLeadNav } from './team-lead.nav';
import { memberNav } from './member.nav';

// WHY: Central dispatch returning the exact sidebar navigation for any given user role slug.
// Prevents hardcoded link lists inside Layout components.
export function getNavForRole(roleSlug) {
    switch (roleSlug) {
        case ROLES.SYSTEM_ADMIN:
            return platformNav;
        case ROLES.COMPANY_OWNER:
            return executiveNav;
        case ROLES.COMPLIANCE_OFFICER:
            return complianceNav;
        case ROLES.HR_MANAGER:
            return hrNav;
        case ROLES.PROCESS_ADMIN:
            return processAdminNav;
        case ROLES.PROJECT_MANAGER:
            return pmNav;
        case ROLES.TEAM_LEADER:
            return teamLeadNav;
        case ROLES.TEAM_MEMBER:
            return memberNav;
        default:
            return [];
    }
}

export {
    platformNav,
    executiveNav,
    complianceNav,
    hrNav,
    processAdminNav,
    pmNav,
    teamLeadNav,
    memberNav,
};
