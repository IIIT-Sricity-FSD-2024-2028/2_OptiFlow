import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listRoleTemplates
} from '../controllers/role-templates.controller.js';

const router = Router();

// Role Templates Routes
router.get(['/role-templates', '/api/role-templates'], authenticate, listRoleTemplates);



export default router;
