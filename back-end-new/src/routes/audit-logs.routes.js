import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listAuditLogs,
  listAuditLogsByUser,
  listAuditLogsByEntity,
  createAuditLogEndpoint
} from '../controllers/audit-logs.controller.js';

const router = Router();

// Audit Logs Routes
router.get(['/audit-logs', '/api/audit-logs'], authenticate, listAuditLogs);
router.get(['/audit-logs/by-user/:userId', '/api/audit-logs/by-user/:userId'], authenticate, listAuditLogsByUser);
router.get(['/audit-logs/by-entity/:entityType/:entityId', '/api/audit-logs/by-entity/:entityType/:entityId'], authenticate, listAuditLogsByEntity);
router.post(['/audit-logs', '/api/audit-logs'], authenticate, createAuditLogEndpoint);



export default router;
