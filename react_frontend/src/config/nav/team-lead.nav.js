import { PATHS } from '../../app/paths';

// breakdown tasks, assign work to team members, review progress, and report blockers.
export const teamLeadNav = [
    { label: 'Team Dashboard', path: PATHS.TEAM_LEAD.DASHBOARD, icon: 'Kanban' },
    { label: 'Team Tasks', path: PATHS.TEAM_LEAD.TASKS, icon: 'ListTodo' },
    { label: 'Subtask Reviews', path: PATHS.TEAM_LEAD.REVIEWS, icon: 'CheckCircle2' },
    { label: 'Escalations', path: PATHS.TEAM_LEAD.ESCALATIONS, icon: 'AlertCircle' },
];
