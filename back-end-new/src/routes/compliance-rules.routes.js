import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listComplianceRules,
  getComplianceRuleById,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  triggerComplianceEngine
} from '../controllers/compliance-rules.controller.js';

const router = Router();

// Rules
router.get(['/compliance-rules', '/api/compliance-rules'], authenticate, listComplianceRules);
router.get(['/compliance-rules/:id', '/api/compliance-rules/:id'], authenticate, getComplianceRuleById);
router.post(
  ['/compliance-rules', '/api/compliance-rules'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  createComplianceRule
);
router.patch(
  ['/compliance-rules/:id', '/api/compliance-rules/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  updateComplianceRule
);
router.delete(
  ['/compliance-rules/:id', '/api/compliance-rules/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, 'superuser'),
  deleteComplianceRule,
  triggerComplianceEngine
);



router.post(["/compliance-rules/run-engine", "/api/compliance-rules/run-engine"], authenticate, requireRoles(ROLES.COMPANY_OWNER, ROLES.COMPLIANCE_OFFICER, "superuser", "compliance_officer"), triggerComplianceEngine);
export default router;
