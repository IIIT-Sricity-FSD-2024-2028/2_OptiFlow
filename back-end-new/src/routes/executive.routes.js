import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  getExecutiveBranches,
  getExecutiveMetrics,
  getExecutivePortfolio,
  getBranchPerformance,
  listProjectManagers,
  assignProjectManager,
  EXECUTIVE_ALLOWED_ROLES
} from '../controllers/executive.controller.js';

const router = Router();
const executiveOnly = [authenticate, requireRoles(...EXECUTIVE_ALLOWED_ROLES)];

router.get(['/executive/branches', '/api/executive/branches'], ...executiveOnly, getExecutiveBranches);
router.get(
  ['/executive/metrics', '/api/executive/metrics', '/metrics', '/api/metrics'],
  ...executiveOnly,
  getExecutiveMetrics
);
router.get(['/executive/portfolio', '/api/executive/portfolio'], ...executiveOnly, getExecutivePortfolio);
router.get(
  ['/executive/branch-performance', '/api/executive/branch-performance'],
  ...executiveOnly,
  getBranchPerformance
);
router.get(
  ['/executive/project-managers', '/api/executive/project-managers'],
  ...executiveOnly,
  listProjectManagers
);
router.patch(
  ['/executive/projects/:id/manager', '/api/executive/projects/:id/manager'],
  ...executiveOnly,
  assignProjectManager
);

export default router;
