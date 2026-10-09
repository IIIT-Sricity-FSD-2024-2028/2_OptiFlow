import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  getExecutiveBranches,
  getExecutiveMetrics,
  EXECUTIVE_ALLOWED_ROLES
} from '../controllers/executive.controller.js';

const router = Router();

router.get(
  ['/executive/branches', '/api/executive/branches'],
  authenticate,
  requireRoles(...EXECUTIVE_ALLOWED_ROLES),
  getExecutiveBranches
);
router.get(
  ['/executive/metrics', '/api/executive/metrics', '/metrics', '/api/metrics'],
  authenticate,
  requireRoles(...EXECUTIVE_ALLOWED_ROLES),
  getExecutiveMetrics
);

export default router;
