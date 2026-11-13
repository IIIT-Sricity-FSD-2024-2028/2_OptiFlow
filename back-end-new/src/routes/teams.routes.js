import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from '../controllers/teams.controller.js';

const router = Router();

// Role lists use the login slugs (PRE-M5-05).
// Project Managers no longer create or edit team records (SEC-M5-16): a team is not one of
// "their projects". Branch Managers stay, limited to their branch by the controller.
const TEAM_EDITORS = ['system_admin', 'company_owner', 'hr_manager', 'branch_manager'];
// Who may reach the member endpoints; the controller narrows this further (SEC-M5-16):
// Branch Managers to their branch, Team Leaders to a team they lead, PMs to teams on their projects.
const MEMBER_EDITORS = ['system_admin', 'company_owner', 'hr_manager', 'branch_manager', 'project_manager', 'team_leader'];

// Teams Routes
router.get(['/teams', '/api/teams'], authenticate, listTeams);
router.get(['/teams/:id', '/api/teams/:id'], authenticate, getTeamById);
router.post(['/teams', '/api/teams'], authenticate, requireRoles(...TEAM_EDITORS), createTeam);
router.patch(['/teams/:id', '/api/teams/:id'], authenticate, requireRoles(...TEAM_EDITORS), updateTeam);
router.delete(
  ['/teams/:id', '/api/teams/:id'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  deleteTeam
);

// Team Members Routes
router.post(['/teams/:id/members', '/api/teams/:id/members'], authenticate, requireRoles(...MEMBER_EDITORS), addTeamMember);
router.patch(
  ['/teams/:id/members/:userId', '/api/teams/:id/members/:userId'],
  authenticate,
  requireRoles(...MEMBER_EDITORS),
  updateTeamMemberRole
);
router.delete(
  ['/teams/:id/members/:userId', '/api/teams/:id/members/:userId'],
  authenticate,
  requireRoles(...MEMBER_EDITORS),
  removeTeamMember
);

export default router;
