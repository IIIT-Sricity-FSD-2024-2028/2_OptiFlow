import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listUsers,
  listUserRoleMappings,
  getUserById,
  createUser,
  updateUser,
  deactivateUser
} from '../controllers/users.controller.js';

const router = Router();

// User Routes
router.get(['/users', '/api/users'], authenticate, listUsers);
router.get(['/users/roles/mapping', '/api/users/roles/mapping'], authenticate, listUserRoleMappings);
router.get(['/users/:id', '/api/users/:id'], authenticate, getUserById);
router.post(
  ['/users', '/api/users'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  createUser
);
router.patch(['/users/:id', '/api/users/:id'], authenticate, updateUser);
router.delete(
  ['/users/:id', '/api/users/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  deactivateUser
);

export default router;
