import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRoles } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import {
  listTasks,
  listTasksByAssignee,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  listSubtasks,
  listSubtasksByTask,
  getSubtaskById,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  listEscalations,
  getEscalationById,
  createEscalation,
  updateEscalation,
  deleteEscalation
} from '../controllers/tasks.controller.js';

const router = Router();

// Tasks Routes
router.get(['/tasks', '/api/tasks'], authenticate, listTasks);
router.get(['/tasks/assignee/:userId', '/api/tasks/assignee/:userId'], authenticate, listTasksByAssignee);
router.get(['/tasks/:id', '/api/tasks/:id'], authenticate, getTaskById);
router.post(
  ['/tasks', '/api/tasks'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'branch_manager', 'team_leader', 'team_lead'),
  createTask
);
router.patch(
  ['/tasks/:id', '/api/tasks/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, ROLES.TEAM_LEAD, ROLES.TEAM_MEMBER, 'superuser', 'project_manager', 'branch_manager', 'team_leader', 'team_lead', 'team_member'),
  updateTask
);
router.delete(
  ['/tasks/:id', '/api/tasks/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.BRANCH_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'branch_manager', 'team_leader', 'team_lead'),
  deleteTask
);

// Subtasks Routes
router.get(['/subtasks', '/api/subtasks'], authenticate, listSubtasks);
router.get(['/subtasks/by-task/:taskId', '/api/subtasks/by-task/:taskId'], authenticate, listSubtasksByTask);
router.get(['/subtasks/:id', '/api/subtasks/:id'], authenticate, getSubtaskById);
router.post(
  ['/subtasks', '/api/subtasks'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'team_leader', 'team_lead'),
  createSubtask
);
router.patch(
  ['/subtasks/:id', '/api/subtasks/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, ROLES.TEAM_MEMBER, 'superuser', 'project_manager', 'team_leader', 'team_lead', 'team_member'),
  updateSubtask
);
router.delete(
  ['/subtasks/:id', '/api/subtasks/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'team_leader', 'team_lead'),
  deleteSubtask
);

// Escalations Routes
router.get(['/escalations', '/api/escalations'], authenticate, listEscalations);
router.get(['/escalations/:id', '/api/escalations/:id'], authenticate, getEscalationById);
router.post(
  ['/escalations', '/api/escalations'],
  authenticate,
  createEscalation
);
router.patch(
  ['/escalations/:id', '/api/escalations/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'team_leader', 'team_lead'),
  updateEscalation
);
router.delete(
  ['/escalations/:id', '/api/escalations/:id'],
  authenticate,
  requireRoles(ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD, 'superuser', 'project_manager', 'team_leader', 'team_lead'),
  deleteEscalation
);

export default router;
