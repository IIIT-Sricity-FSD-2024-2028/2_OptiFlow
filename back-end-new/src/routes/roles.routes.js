import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listRoles,
  getRoleById,
  createCustomRole,
  updateRolePermissions,
  deleteRole,
} from '../controllers/roles.controller.js';

const router = Router();

// Roles Routes
router.get(['/roles', '/api/roles'], authenticate, listRoles);
router.get(['/roles/:id', '/api/roles/:id'], authenticate, getRoleById);
router.post(
  ['/roles', '/api/roles'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  createCustomRole
);
router.put(
  ['/roles/:id/permissions', '/api/roles/:id/permissions'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  updateRolePermissions
);
router.patch(
  ['/roles/:id/permissions', '/api/roles/:id/permissions'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  updateRolePermissions
);
router.delete(
  ['/roles/:id', '/api/roles/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  deleteRole
);

export default router;
