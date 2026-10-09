import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listComplianceCategories,
  getComplianceCategoryById,
  createComplianceCategory,
  updateComplianceCategory,
  deleteComplianceCategory
} from '../controllers/compliance-categories.controller.js';

const router = Router();

// Categories routes
router.get(['/compliance-categories', '/api/compliance-categories'], authenticate, listComplianceCategories);
router.get(['/compliance-categories/:id', '/api/compliance-categories/:id'], authenticate, getComplianceCategoryById);
router.post(
  ['/compliance-categories', '/api/compliance-categories'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  createComplianceCategory
);
router.patch(
  ['/compliance-categories/:id', '/api/compliance-categories/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  updateComplianceCategory
);
router.delete(
  ['/compliance-categories/:id', '/api/compliance-categories/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, 'superuser'),
  deleteComplianceCategory
);



export default router;
