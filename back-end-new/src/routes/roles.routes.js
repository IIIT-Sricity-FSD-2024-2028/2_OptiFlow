import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listRoles,
  getRoleById,
  createCustomRole,
  updateRolePermissions,
  updateRole,
  deleteRole,
} from '../controllers/roles.controller.js';

const router = Router();

// Roles Routes
// Read scope (X2): roles are read by the HR and Executive pages only.
const canReadRoles = requireRoles(
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.ACCESS_GOVERNANCE,
  'superuser'
);
router.get(['/roles', '/api/roles'], authenticate, canReadRoles, listRoles);
router.get(['/roles/:id', '/api/roles/:id'], authenticate, canReadRoles, getRoleById);
router.post(
  ['/roles', '/api/roles'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  createCustomRole
);
router.patch(
  ['/roles/:id', '/api/roles/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  updateRole
);
router.delete(
  ['/roles/:id', '/api/roles/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.ACCESS_GOVERNANCE, 'hr_manager', ROLES.SUPERUSER),
  deleteRole
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

export default router;
