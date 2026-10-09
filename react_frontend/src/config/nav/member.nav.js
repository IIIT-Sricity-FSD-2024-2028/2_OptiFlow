import { PATHS } from '../../app/paths';

// Team Members view assigned tasks, submit compliance evidence, and trigger blockers.
export const memberNav = [
    { label: 'My Workspace', path: PATHS.MEMBER.DASHBOARD, icon: 'Home' },
    { label: 'My Tasks', path: PATHS.MEMBER.TASKS, icon: 'CheckSquare' },
    { label: 'Evidence Submissions', path: PATHS.MEMBER.EVIDENCE, icon: 'UploadCloud' },
    { label: 'My Escalations', path: PATHS.MEMBER.ESCALATIONS, icon: 'HelpCircle' },
];
