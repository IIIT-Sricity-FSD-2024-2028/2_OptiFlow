import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
} from '../controllers/branches.controller.js';

const router = Router();

// Branches Routes (the old /departments alias was removed in PRE-M5-06)
// WHY: Access Governance / HR Manager (slug 'hr_manager') is authorized to create, update,
// and delete branches as documented in Section 2.2 of ACTORS_INTERACTIONS_AND_COMPONENT_STATUS.md.
router.get(['/branches', '/api/branches'], authenticate, listBranches);
router.get(['/branches/:id', '/api/branches/:id'], authenticate, getBranchById);
router.post(
  ['/branches', '/api/branches'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  createBranch
);
router.patch(
  ['/branches/:id', '/api/branches/:id'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  updateBranch
);
router.delete(
  ['/branches/:id', '/api/branches/:id'],
  authenticate,
  requireRoles('system_admin', 'company_owner', 'hr_manager'),
  deleteBranch
);



export default router;
