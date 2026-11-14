import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import { PROCESS_MANAGER_ROLES, PROCESS_ADMIN_ROLES } from '../controllers/process.controller.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplateSteps,
  addTemplateStep,
  listInstances,
  getInstance,
  createInstance,
  updateInstance,
  deleteInstance,
  listSteps,
  getStep,
  createStep,
  actionStep
} from '../controllers/process.controller.js';

const router = Router();

// ============================================================================
// ROUTE REGISTRATIONS (PRE-M4-02: Canonical /api/* and legacy aliases)
// ============================================================================

// Templates
router.get(
  ['/process-templates', '/api/process-templates', '/processes/templates', '/api/processes/templates'],
  authenticate,
  listTemplates
);

router.get(
  ['/process-templates/:id', '/api/process-templates/:id', '/processes/templates/:id', '/api/processes/templates/:id'],
  authenticate,
  getTemplate
);

router.post(
  ['/process-templates', '/api/process-templates', '/processes/templates', '/api/processes/templates'],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  createTemplate
);

router.patch(
  ['/process-templates/:id', '/api/process-templates/:id', '/processes/templates/:id', '/api/processes/templates/:id'],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  updateTemplate
);

router.delete(
  ['/process-templates/:id', '/api/process-templates/:id', '/processes/templates/:id', '/api/processes/templates/:id'],
  authenticate,
  requireRoles(...PROCESS_ADMIN_ROLES),
  deleteTemplate
);

// Template Steps
router.get(
  [
    '/process-templates/:id/steps',
    '/api/process-templates/:id/steps',
    '/processes/templates/:id/steps',
    '/api/processes/templates/:id/steps',
  ],
  authenticate,
  listTemplateSteps
);

router.post(
  [
    '/process-templates/:id/steps',
    '/api/process-templates/:id/steps',
    '/processes/templates/:id/steps',
    '/api/processes/templates/:id/steps',
  ],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  addTemplateStep
);

// Instances
router.get(
  ['/process-instances', '/api/process-instances', '/processes/instances', '/api/processes/instances'],
  authenticate,
  listInstances
);

router.get(
  ['/process-instances/:id', '/api/process-instances/:id', '/processes/instances/:id', '/api/processes/instances/:id'],
  authenticate,
  getInstance
);

router.post(
  ['/process-instances', '/api/process-instances', '/processes/instances', '/api/processes/instances'],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  createInstance
);

router.patch(
  ['/process-instances/:id', '/api/process-instances/:id', '/processes/instances/:id', '/api/processes/instances/:id'],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  updateInstance
);

router.delete(
  ['/process-instances/:id', '/api/process-instances/:id', '/processes/instances/:id', '/api/processes/instances/:id'],
  authenticate,
  requireRoles(...PROCESS_ADMIN_ROLES),
  deleteInstance
);

// Steps
router.get(
  ['/process-instance-steps', '/api/process-instance-steps', '/processes/steps', '/api/processes/steps'],
  authenticate,
  listSteps
);

router.get(
  ['/process-instance-steps/:id', '/api/process-instance-steps/:id', '/processes/steps/:id', '/api/processes/steps/:id'],
  authenticate,
  getStep
);

router.post(
  ['/process-instance-steps', '/api/process-instance-steps', '/processes/steps', '/api/processes/steps'],
  authenticate,
  requireRoles(...PROCESS_MANAGER_ROLES),
  createStep
);

router.patch(
  [
    '/process-instance-steps/:id',
    '/api/process-instance-steps/:id',
    '/process-instance-steps/:id/action',
    '/api/process-instance-steps/:id/action',
    '/processes/steps/:id/action',
    '/api/processes/steps/:id/action',
  ],
  authenticate,
  actionStep
);

export default router;
