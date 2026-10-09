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
// ROUTE REGISTRATIONS
// ============================================================================

// Templates
router.get('/process-templates', authenticate, listTemplates);
router.get('/processes/templates', authenticate, listTemplates);
router.get('/api/process-templates', authenticate, listTemplates);
router.get('/api/processes/templates', authenticate, listTemplates);

router.get('/process-templates/:id', authenticate, getTemplate);
router.get('/processes/templates/:id', authenticate, getTemplate);
router.get('/api/process-templates/:id', authenticate, getTemplate);
router.get('/api/processes/templates/:id', authenticate, getTemplate);

router.post('/process-templates', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createTemplate);
router.post('/processes/templates', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createTemplate);
router.post('/api/process-templates', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createTemplate);
router.post('/api/processes/templates', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createTemplate);

router.patch('/process-templates/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateTemplate);
router.patch('/processes/templates/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateTemplate);
router.patch('/api/process-templates/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateTemplate);
router.patch('/api/processes/templates/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateTemplate);

router.delete('/process-templates/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteTemplate);
router.delete('/processes/templates/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteTemplate);
router.delete('/api/process-templates/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteTemplate);
router.delete('/api/processes/templates/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteTemplate);

router.get('/processes/templates/:id/steps', authenticate, listTemplateSteps);
router.get('/api/processes/templates/:id/steps', authenticate, listTemplateSteps);
router.post('/processes/templates/:id/steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), addTemplateStep);
router.post('/api/processes/templates/:id/steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), addTemplateStep);

// Instances
router.get('/process-instances', authenticate, listInstances);
router.get('/processes/instances', authenticate, listInstances);
router.get('/api/process-instances', authenticate, listInstances);
router.get('/api/processes/instances', authenticate, listInstances);

router.get('/process-instances/:id', authenticate, getInstance);
router.get('/processes/instances/:id', authenticate, getInstance);
router.get('/api/process-instances/:id', authenticate, getInstance);
router.get('/api/processes/instances/:id', authenticate, getInstance);

router.post('/process-instances', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createInstance);
router.post('/processes/instances', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createInstance);
router.post('/api/process-instances', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createInstance);
router.post('/api/processes/instances', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createInstance);

router.patch('/process-instances/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateInstance);
router.patch('/processes/instances/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateInstance);
router.patch('/api/process-instances/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateInstance);
router.patch('/api/processes/instances/:id', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), updateInstance);

router.delete('/process-instances/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteInstance);
router.delete('/processes/instances/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteInstance);
router.delete('/api/process-instances/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteInstance);
router.delete('/api/processes/instances/:id', authenticate, requireRoles(...PROCESS_ADMIN_ROLES), deleteInstance);

// Steps
router.get('/process-instance-steps', authenticate, listSteps);
router.get('/processes/steps', authenticate, listSteps);
router.get('/api/process-instance-steps', authenticate, listSteps);
router.get('/api/processes/steps', authenticate, listSteps);

router.get('/process-instance-steps/:id', authenticate, getStep);
router.get('/processes/steps/:id', authenticate, getStep);
router.get('/api/process-instance-steps/:id', authenticate, getStep);
router.get('/api/processes/steps/:id', authenticate, getStep);

router.post('/process-instance-steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createStep);
router.post('/processes/steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createStep);
router.post('/api/process-instance-steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createStep);
router.post('/api/processes/steps', authenticate, requireRoles(...PROCESS_MANAGER_ROLES), createStep);

router.patch('/process-instance-steps/:id', authenticate, actionStep);
router.patch('/process-instance-steps/:id/action', authenticate, actionStep);
router.patch('/processes/steps/:id/action', authenticate, actionStep);
router.patch('/api/process-instance-steps/:id', authenticate, actionStep);
router.patch('/api/process-instance-steps/:id/action', authenticate, actionStep);
router.patch('/api/processes/steps/:id/action', authenticate, actionStep);

export default router;
