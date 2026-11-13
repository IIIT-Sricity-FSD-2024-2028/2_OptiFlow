import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  listNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get(['/notifications', '/api/notifications'], authenticate, listNotifications);
router.post(
  ['/notifications', '/api/notifications'],
  authenticate,
  // SEC-M5-13: Owner / System Admin, and Team Leaders for their own team (TL dashboard flows).
  // Everything else is created by server code (D-S12).
  requireRoles('company_owner', 'system_admin', 'team_leader'),
  createNotification
);
router.patch(['/notifications/:id/read', '/api/notifications/:id/read'], authenticate, markNotificationAsRead);
router.post(['/notifications/read-all', '/api/notifications/read-all'], authenticate, markAllNotificationsAsRead);
router.delete(['/notifications/:id', '/api/notifications/:id'], authenticate, deleteNotification);

export default router;
