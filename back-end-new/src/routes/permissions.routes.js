import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listPermissions
} from '../controllers/permissions.controller.js';

const router = Router();

// Permissions Routes
router.get(['/permissions', '/api/permissions'], authenticate, listPermissions);



export default router;
