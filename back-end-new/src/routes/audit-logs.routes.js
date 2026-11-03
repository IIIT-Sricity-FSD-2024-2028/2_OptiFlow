import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listAuditLogs,
  listSystemAuditLogs,
  listProcessAuditLogs,
  listAuditLogsByUser,
  listAuditLogsByEntity,
  createAuditLogEndpoint
} from '../controllers/audit-logs.controller.js';

const router = Router();

// Read scope (X2): audit trails are visible to the roles whose pages show them
// (Executive, HR, Compliance, Process Admin). Project Managers, Team Leaders and Team Members get 403.
const canReadAudit = requireRoles(
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.ACCESS_GOVERNANCE,
  ROLES.PROCESS_ADMIN,
  ROLES.COMPLIANCE_OFFICER,
  'superuser'
);

// Audit Logs Routes
router.get(['/audit-logs/system', '/api/audit-logs/system'], authenticate, canReadAudit, listSystemAuditLogs);
router.get(['/audit-logs/process', '/api/audit-logs/process'], authenticate, canReadAudit, listProcessAuditLogs);
router.get(['/audit-logs', '/api/audit-logs'], authenticate, canReadAudit, listAuditLogs);
router.get(['/audit-logs/by-user/:userId', '/api/audit-logs/by-user/:userId'], authenticate, canReadAudit, listAuditLogsByUser);
router.get(['/audit-logs/by-entity/:entityType/:entityId', '/api/audit-logs/by-entity/:entityType/:entityId'], authenticate, canReadAudit, listAuditLogsByEntity);
router.post(['/audit-logs', '/api/audit-logs'], authenticate, createAuditLogEndpoint);



export default router;
