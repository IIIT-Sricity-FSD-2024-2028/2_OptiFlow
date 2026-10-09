import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listRoles,
  getRoleById
} from '../controllers/roles.controller.js';

const router = Router();

// Roles Routes
router.get(['/roles', '/api/roles'], authenticate, listRoles);
router.get(['/roles/:id', '/api/roles/:id'], authenticate, getRoleById);



export default router;
