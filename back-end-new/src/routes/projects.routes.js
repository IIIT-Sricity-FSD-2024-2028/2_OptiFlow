import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projects.controller.js';

const router = Router();

// Project Routes
router.get(['/projects', '/api/projects'], authenticate, listProjects);
router.get(['/projects/:id', '/api/projects/:id'], authenticate, getProjectById);
router.post(
  ['/projects', '/api/projects'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, 'superuser', 'project_manager', 'branch_manager'),
  createProject
);
router.patch(
  ['/projects/:id', '/api/projects/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, 'superuser', 'project_manager', 'branch_manager'),
  updateProject
);
router.delete(
  ['/projects/:id', '/api/projects/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, 'superuser', 'project_manager', 'branch_manager'),
  deleteProject
);

export default router;
