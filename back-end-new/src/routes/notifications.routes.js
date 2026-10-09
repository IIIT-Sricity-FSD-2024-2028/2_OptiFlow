import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notifications.controller.js';

const router = Router();

router.get(['/notifications', '/api/notifications'], authenticate, listNotifications);
router.post(
  ['/notifications', '/api/notifications'],
  authenticate,
  requireRoles(
    ROLES.COMPANY_OWNER,
    ROLES.SYSTEM_ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.TEAM_LEAD,
    ROLES.COMPLIANCE_OFFICER,
    'superuser',
    'project_manager',
    'team_leader',
    'team_lead',
    'compliance_officer'
  ),
  createNotification
);
router.patch(['/notifications/:id/read', '/api/notifications/:id/read'], authenticate, markNotificationAsRead);
router.post(['/notifications/read-all', '/api/notifications/read-all'], authenticate, markAllNotificationsAsRead);

export default router;
