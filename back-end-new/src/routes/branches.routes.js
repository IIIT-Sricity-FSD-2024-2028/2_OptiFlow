import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
} from '../controllers/branches.controller.js';

const router = Router();

// Branches Routes (with /departments alias for frontend helper compatibility)
// WHY: Access Governance / HR Manager (ROLES.ACCESS_GOVERNANCE, 'hr_manager') is authorized to create, update,
// and delete branches as documented in Section 2.2 of ACTORS_INTERACTIONS_AND_COMPONENT_STATUS.md.
router.get(['/branches', '/api/branches', '/departments', '/api/departments'], authenticate, listBranches);
router.get(['/branches/:id', '/api/branches/:id', '/departments/:id', '/api/departments/:id'], authenticate, getBranchById);
router.post(
  ['/branches', '/api/branches', '/departments', '/api/departments'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  createBranch
);
router.patch(
  ['/branches/:id', '/api/branches/:id', '/departments/:id', '/api/departments/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  updateBranch
);
router.delete(
  ['/branches/:id', '/api/branches/:id', '/departments/:id', '/api/departments/:id'],
  authenticate,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.COMPANY_OWNER, ROLES.ACCESS_GOVERNANCE, 'hr_manager'),
  deleteBranch
);



export default router;
