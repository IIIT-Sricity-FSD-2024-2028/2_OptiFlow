import { Router } from 'express';
import { authenticatePlatformAdmin } from '../middleware/authenticatePlatformAdmin.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  platformLogin,
  platformLogout,
  changePlatformPassword,
  platformAuthMe,
  getPlatformMetrics,
  listPlatformCompanies,
  getPlatformCompanyById,
  createPlatformCompany,
  updatePlatformCompany,
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  listSubscriptions,
  createSubscription,
  listPlatformAdminUsers,
  getPlatformAdminUserById,
  createPlatformAdminUser,
  updatePlatformAdminUser,
  deletePlatformAdminUser,
  listPlatformSupportAccesses,
  getPlatformSupportAccessById,
  createPlatformSupportAccess,
  revokePlatformSupportAccess
} from '../controllers/platform.controller.js';

const router = Router();

router.post(['/platform/auth/login', '/api/platform/auth/login'], platformLogin);
router.post(['/platform/auth/logout', '/api/platform/auth/logout'], platformLogout);
router.post(
  ['/platform/auth/change-password', '/api/platform/auth/change-password'],
  authLimiter,
  authenticatePlatformAdmin,
  changePlatformPassword
);
router.get(['/platform/auth/me', '/api/platform/auth/me'], authenticatePlatformAdmin, platformAuthMe);
router.get(['/platform/metrics', '/api/platform/metrics'], authenticatePlatformAdmin, getPlatformMetrics);
router.get(['/platform/companies', '/api/platform/companies'], authenticatePlatformAdmin, listPlatformCompanies);
router.post(['/platform/companies', '/api/platform/companies'], authenticatePlatformAdmin, createPlatformCompany);
router.get(['/platform/companies/:id', '/api/platform/companies/:id'], authenticatePlatformAdmin, getPlatformCompanyById);
router.patch(['/platform/companies/:id', '/api/platform/companies/:id'], authenticatePlatformAdmin, updatePlatformCompany);
router.get(['/platform/plans', '/api/platform/plans'], authenticatePlatformAdmin, listPlans);
router.get(['/platform/plans/:id', '/api/platform/plans/:id'], authenticatePlatformAdmin, getPlanById);
router.post(['/platform/plans', '/api/platform/plans'], authenticatePlatformAdmin, createPlan);
router.patch(['/platform/plans/:id', '/api/platform/plans/:id'], authenticatePlatformAdmin, updatePlan);
router.get(['/platform/subscriptions', '/api/platform/subscriptions'], authenticatePlatformAdmin, listSubscriptions);
router.post(['/platform/subscriptions', '/api/platform/subscriptions'], authenticatePlatformAdmin, createSubscription);
router.get(['/platform/admin-users', '/api/platform/admin-users', '/api/platform-admin-users'], authenticatePlatformAdmin, listPlatformAdminUsers);
router.get(['/platform/admin-users/:id', '/api/platform/admin-users/:id', '/api/platform-admin-users/:id'], authenticatePlatformAdmin, getPlatformAdminUserById);
router.post(['/platform/admin-users', '/api/platform/admin-users', '/api/platform-admin-users'], authenticatePlatformAdmin, createPlatformAdminUser);
router.patch(['/platform/admin-users/:id', '/api/platform/admin-users/:id', '/api/platform-admin-users/:id'], authenticatePlatformAdmin, updatePlatformAdminUser);
router.delete(['/platform/admin-users/:id', '/api/platform/admin-users/:id', '/api/platform-admin-users/:id'], authenticatePlatformAdmin, deletePlatformAdminUser);
router.get(
  ['/platform/support-access', '/api/platform/support-access', '/platform-support-access', '/api/platform-support-access'],
  authenticatePlatformAdmin,
  listPlatformSupportAccesses
);
router.get(
  ['/platform/support-access/:id', '/api/platform/support-access/:id', '/platform-support-access/:id', '/api/platform-support-access/:id'],
  authenticatePlatformAdmin,
  getPlatformSupportAccessById
);
router.post(
  ['/platform/support-access', '/api/platform/support-access', '/platform-support-access', '/api/platform-support-access'],
  authenticatePlatformAdmin,
  createPlatformSupportAccess
);
router.delete(
  ['/platform/support-access/:id', '/api/platform/support-access/:id', '/platform-support-access/:id', '/api/platform-support-access/:id'],
  authenticatePlatformAdmin,
  revokePlatformSupportAccess
);

export default router;
