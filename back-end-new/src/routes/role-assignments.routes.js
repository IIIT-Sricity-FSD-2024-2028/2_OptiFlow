import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listRoleAssignments,
  createRoleAssignment,
  deleteRoleAssignment
} from '../controllers/role-assignments.controller.js';

const router = Router();

// Role Assignments Routes
router.get(['/role-assignments', '/api/role-assignments'], authenticate, listRoleAssignments);
router.post(
  ['/role-assignments', '/api/role-assignments'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  createRoleAssignment
);
router.delete(
  ['/role-assignments/:id', '/api/role-assignments/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  deleteRoleAssignment
);



export default router;
