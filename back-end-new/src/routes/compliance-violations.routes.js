import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listComplianceViolations,
  getComplianceViolationById,
  createComplianceViolation,
  updateComplianceViolation,
  deleteComplianceViolation
} from '../controllers/compliance-violations.controller.js';

const router = Router();

// Violations
router.get(['/compliance-violations', '/api/compliance-violations'], authenticate, listComplianceViolations);
router.get(['/compliance-violations/:id', '/api/compliance-violations/:id'], authenticate, getComplianceViolationById);
router.post(
  ['/compliance-violations', '/api/compliance-violations'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  createComplianceViolation
);
router.patch(
  ['/compliance-violations/:id', '/api/compliance-violations/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.PROJECT_MANAGER, 'superuser', 'compliance_officer', 'project_manager'),
  updateComplianceViolation
);
router.delete(
  ['/compliance-violations/:id', '/api/compliance-violations/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, 'superuser'),
  deleteComplianceViolation
);



export default router;
