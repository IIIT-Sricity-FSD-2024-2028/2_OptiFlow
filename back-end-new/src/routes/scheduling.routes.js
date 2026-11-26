import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  getSchedulingPolicy,
  updateSchedulingPolicy,
  addCompanyHoliday,
  deleteCompanyHoliday,
  getTaskScheduleAnalysis,
  autoScheduleTask,
} from '../controllers/scheduling.controller.js';

const router = Router();
const ADMIN_ROLES = [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, 'company_owner', 'system_admin'];
const AUTO_SCHEDULE_ROLES = [
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.PROJECT_MANAGER,
  ROLES.TEAM_LEAD,
  'company_owner',
  'system_admin',
  'project_manager',
  'pm',
  'team_leader',
  'team_lead',
];

router.get(['/scheduling/policy', '/api/scheduling/policy'], authenticate, getSchedulingPolicy);
router.patch(
  ['/scheduling/policy', '/api/scheduling/policy'],
  authenticate,
  requireRoles(...ADMIN_ROLES),
  updateSchedulingPolicy
);
router.post(
  ['/scheduling/holidays', '/api/scheduling/holidays'],
  authenticate,
  requireRoles(...ADMIN_ROLES),
  addCompanyHoliday
);
router.delete(
  ['/scheduling/holidays/:id', '/api/scheduling/holidays/:id'],
  authenticate,
  requireRoles(...ADMIN_ROLES),
  deleteCompanyHoliday
);

router.get(
  ['/tasks/:id/schedule-analysis', '/api/tasks/:id/schedule-analysis'],
  authenticate,
  getTaskScheduleAnalysis
);
router.post(
  ['/tasks/:id/auto-schedule', '/api/tasks/:id/auto-schedule'],
  authenticate,
  requireRoles(...AUTO_SCHEDULE_ROLES),
  autoScheduleTask
);

export default router;
