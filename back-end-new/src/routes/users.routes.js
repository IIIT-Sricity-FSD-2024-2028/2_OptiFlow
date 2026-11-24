import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  listUsers,
  listUserRoleMappings,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  requestEmailChange,
  confirmEmailChange,
} from '../controllers/users.controller.js';
import { changePasswordLimiter, setPasswordLimiter, createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Every email-change request sends a mail, so every attempt counts, successes and failures alike
// (changePasswordLimiter only counts wrong passwords). Five wrong passwords therefore also use up
// the hour. Mount after authenticate: keyed by the signed-in user.
const emailChangeRequestLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `email-change:${req.user?.id || req.ip}`,
  message: 'Too many email change requests. Please try again later.',
});

// Own email change (SEC-M5-06): request needs the current password, confirm needs the emailed link.
router.post(['/users/me/email-change', '/api/users/me/email-change'], authenticate, emailChangeRequestLimiter, changePasswordLimiter, requestEmailChange);
router.post(['/users/email-change/confirm', '/api/users/email-change/confirm'], setPasswordLimiter, confirmEmailChange);

// User Routes
router.get(['/users', '/api/users'], authenticate, listUsers);
router.get(
  ['/users/roles/mapping', '/api/users/roles/mapping'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  listUserRoleMappings
);
router.get(['/users/:id', '/api/users/:id'], authenticate, getUserById);
router.post(
  ['/users', '/api/users'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  createUser
);
router.patch(['/users/:id', '/api/users/:id'], authenticate, updateUser);
router.patch(
  ['/users/:id/reactivate', '/api/users/:id/reactivate'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  reactivateUser
);
router.post(
  ['/users/:id/reactivate', '/api/users/:id/reactivate'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  reactivateUser
);
router.delete(
  ['/users/:id', '/api/users/:id'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  deactivateUser
);

export default router;
