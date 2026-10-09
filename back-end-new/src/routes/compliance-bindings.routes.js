import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listComplianceBindings,
  getComplianceBindingById,
  createComplianceBinding,
  deleteComplianceBinding
} from '../controllers/compliance-bindings.controller.js';

const router = Router();

// Bindings routes
router.get(['/compliance-bindings', '/api/compliance-bindings'], authenticate, listComplianceBindings);
router.get(['/compliance-bindings/:id', '/api/compliance-bindings/:id'], authenticate, getComplianceBindingById);
router.post(
  ['/compliance-bindings', '/api/compliance-bindings'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  createComplianceBinding
);
router.delete(
  ['/compliance-bindings/:id', '/api/compliance-bindings/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE_OFFICER, 'superuser', 'compliance_officer'),
  deleteComplianceBinding
);



export default router;
