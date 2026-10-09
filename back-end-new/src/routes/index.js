import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import rolesRoutes from './roles.routes.js';
import branchesRoutes from './branches.routes.js';
import teamsRoutes from './teams.routes.js';
import auditLogsRoutes from './audit-logs.routes.js';
import permissionsRoutes from './permissions.routes.js';
import roleTemplatesRoutes from './role-templates.routes.js';
import roleAssignmentsRoutes from './role-assignments.routes.js';
import bootstrapRoutes from './bootstrap.routes.js';
import projectsRoutes from './projects.routes.js';
import tasksRoutes from './tasks.routes.js';
import notificationsRoutes from './notifications.routes.js';
import complianceRulesRoutes from './compliance-rules.routes.js';
import complianceViolationsRoutes from './compliance-violations.routes.js';
import complianceEvidenceRoutes from './compliance-evidence.routes.js';
import complianceCategoriesRoutes from './compliance-categories.routes.js';
import complianceBindingsRoutes from './compliance-bindings.routes.js';
import processRoutes from './process.routes.js';
import platformRoutes from './platform.routes.js';
import executiveRoutes from './executive.routes.js';
import attachmentsRoutes from './attachments.routes.js';

const router = Router();

/**
 * GET /api / GET /api/status
 * Verifies that the central router is mounted and accessible.
 */
router.get(['/api', '/api/status'], (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'OptiFlow API',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
    },
  });
});

// Feature Routers
router.use(authRoutes);
router.use(usersRoutes);
router.use(rolesRoutes);
router.use(branchesRoutes);
router.use(teamsRoutes);
router.use(auditLogsRoutes);
router.use(permissionsRoutes);
router.use(roleTemplatesRoutes);
router.use(roleAssignmentsRoutes);
router.use(bootstrapRoutes);
router.use(projectsRoutes);
router.use(tasksRoutes);
router.use(notificationsRoutes);
router.use(complianceRulesRoutes);
router.use(complianceViolationsRoutes);
router.use(complianceEvidenceRoutes);
router.use(complianceCategoriesRoutes);
router.use(complianceBindingsRoutes);
router.use(processRoutes);
router.use(platformRoutes);
router.use(executiveRoutes);
router.use(attachmentsRoutes);

export default router;
