import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  getBootstrapState
} from '../controllers/bootstrap.controller.js';

const router = Router();

// Bootstrap Aggregator Route
router.get(['/bootstrap', '/api/bootstrap'], authenticate, getBootstrapState);



export default router;
