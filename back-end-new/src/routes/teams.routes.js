import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember
} from '../controllers/teams.controller.js';

const router = Router();

// Teams Routes
router.get(['/teams', '/api/teams'], authenticate, listTeams);
router.get(['/teams/:id', '/api/teams/:id'], authenticate, getTeamById);
router.post(
  ['/teams', '/api/teams'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.PROJECT_MANAGER, ROLES.ACCESS_GOVERNANCE, 'hr_manager', 'branch_manager'),
  createTeam
);
router.patch(
  ['/teams/:id', '/api/teams/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.PROJECT_MANAGER, ROLES.ACCESS_GOVERNANCE, 'hr_manager', 'branch_manager'),
  updateTeam
);
router.delete(
  ['/teams/:id', '/api/teams/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  deleteTeam
);

// Team Members Routes
router.post(
  ['/teams/:id/members', '/api/teams/:id/members'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'hr_manager', 'branch_manager', 'team_leader'),
  addTeamMember
);
router.delete(
  ['/teams/:id/members/:userId', '/api/teams/:id/members/:userId'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'hr_manager', 'branch_manager', 'team_leader'),
  removeTeamMember
);



export default router;
