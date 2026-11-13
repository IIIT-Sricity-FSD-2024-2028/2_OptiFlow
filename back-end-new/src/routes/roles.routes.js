import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
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
const canReadRoles = requireRoles('company_owner', 'system_admin', 'branch_manager', 'hr_manager');
router.get(['/roles', '/api/roles'], authenticate, canReadRoles, listRoles);
router.get(['/roles/:id', '/api/roles/:id'], authenticate, canReadRoles, getRoleById);
router.post(
  ['/roles', '/api/roles'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  createCustomRole
);
router.patch(
  ['/roles/:id', '/api/roles/:id'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  updateRole
);
router.delete(
  ['/roles/:id', '/api/roles/:id'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  deleteRole
);
router.put(
  ['/roles/:id/permissions', '/api/roles/:id/permissions'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  updateRolePermissions
);
router.patch(
  ['/roles/:id/permissions', '/api/roles/:id/permissions'],
  authenticate,
  requireRoles('company_owner', 'system_admin', 'hr_manager'),
  updateRolePermissions
);

export default router;
