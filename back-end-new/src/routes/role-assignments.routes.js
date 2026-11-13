import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  listRoleAssignments,
  createRoleAssignment,
  deleteRoleAssignment
} from '../controllers/role-assignments.controller.js';

const router = Router();

// Role Assignments Routes
// Read scope (X2): only the HR / admin pages read role assignments.
router.get(
  ['/role-assignments', '/api/role-assignments'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  listRoleAssignments
);
router.post(
  ['/role-assignments', '/api/role-assignments'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  createRoleAssignment
);
router.delete(
  ['/role-assignments/:id', '/api/role-assignments/:id'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  deleteRoleAssignment
);



export default router;
