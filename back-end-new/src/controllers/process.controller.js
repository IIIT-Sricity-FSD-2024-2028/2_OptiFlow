import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired, validateEnum, validateNumber } from '../utils/validation.js';
import { ROLES } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


const ALLOWED_STEP_TYPES = ['Approval', 'Input_Required', 'Automated_Task'];
const ALLOWED_INSTANCE_STATUSES = ['Draft', 'Active', 'Completed', 'Cancelled', 'Rejected'];
const ALLOWED_STEP_STATUSES = ['Pending', 'Approved', 'Rejected', 'Skipped'];

export const PROCESS_MANAGER_ROLES = [
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.PROCESS_ADMIN,
  ROLES.PROJECT_MANAGER,
];

export const PROCESS_ADMIN_ROLES = [
  ROLES.COMPANY_OWNER,
  ROLES.SYSTEM_ADMIN,
  ROLES.PROCESS_ADMIN,
];

// ============================================================================
// 1. PROCESS TEMPLATES ENDPOINTS
// ============================================================================

/**
 * GET /process-templates & /processes/templates
 * Lists all templates for the authenticated tenant.
 */
export async function listTemplates(req, res, next) {
  try {
    const templates = await prisma.processTemplate.findMany({
      where: { companyId: req.user.companyId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { onRejectGotoStep: true },
        },
        instances: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /process-templates/:id & /processes/templates/:id
 * Retrieves a single template with steps and instances.
 */
export async function getTemplate(req, res, next) {
  try {
    const template = await prisma.processTemplate.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { onRejectGotoStep: true },
        },
        instances: true,
      },
    });

    if (!template) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /process-templates & /processes/templates
 * Creates a new process template with optional steps.
 */
export async function createTemplate(req, res, next) {
  try {
    const { name, version, isActive, steps } = req.body;
    validateRequired(req.body, ['name']);

    if (version !== undefined) {
      validateNumber(version, 'version');
    }

    const formattedSteps = Array.isArray(steps)
      ? steps.map((s, index) => {
          if (typeof s === 'string') {
            return {
              companyId: req.user.companyId,
              stepOrder: index + 1,
              name: s,
              stepType: 'Automated_Task',
            };
          }
          if (s.stepType) {
            validateEnum(s.stepType, ALLOWED_STEP_TYPES, `steps[${index}].stepType`);
          }
          return {
            companyId: req.user.companyId,
            stepOrder: s.stepOrder ?? index + 1,
            name: s.name || `Step ${index + 1}`,
            stepType: s.stepType || 'Automated_Task',
            onRejectGotoStepId: s.onRejectGotoStepId ?? null,
          };
        })
      : [];

    const created = await prisma.processTemplate.create({
      data: {
        companyId: req.user.companyId,
        name: name.trim(),
        version: version ? Number(version) : 1,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdById: req.user.id,
        steps:
          formattedSteps.length > 0
            ? {
                create: formattedSteps,
              }
            : undefined,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { onRejectGotoStep: true },
        },
        instances: true,
      },
    });

    try {
      await createProcessAuditLog({
        companyId: req.user.companyId,
        templateId: created.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { name: created.name, stepsCount: formattedSteps.length },
      });
    } catch (auditErr) {
      console.warn('Process audit log error on create template:', auditErr?.message);
    }

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /process-templates/:id & /processes/templates/:id
 * Updates an existing process template and optionally replaces steps.
 */
export async function updateTemplate(req, res, next) {
  try {
    const existing = await prisma.processTemplate.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    const { name, version, isActive, steps } = req.body;
    if (version !== undefined) {
      validateNumber(version, 'version');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(steps)) {
        const existingSteps = await tx.processTemplateStep.findMany({
          where: { templateId: req.params.id },
        });

        const formattedSteps = steps.map((s, index) => {
          if (typeof s === 'string') {
            return {
              templateId: req.params.id,
              companyId: req.user.companyId,
              stepOrder: index + 1,
              name: s,
              stepType: 'Automated_Task',
            };
          }
          if (s.stepType) {
            validateEnum(s.stepType, ALLOWED_STEP_TYPES, `steps[${index}].stepType`);
          }
          return {
            id: s.id,
            templateId: req.params.id,
            companyId: req.user.companyId,
            stepOrder: s.stepOrder ?? index + 1,
            name: s.name || `Step ${index + 1}`,
            stepType: s.stepType || 'Approval',
            onRejectGotoStepId: s.onRejectGotoStepId ?? null,
            onRejectGotoStepOrder: s.onRejectGotoStepOrder ?? null,
          };
        });

        const stepIdMap = new Map();
        const existingIdSet = new Set(existingSteps.map((es) => es.id));

        // Phase 1: Update existing steps or insert new ones
        for (let i = 0; i < formattedSteps.length; i++) {
          const s = formattedSteps[i];
          const isExisting = s.id && existingIdSet.has(s.id);

          if (isExisting) {
            const updatedStep = await tx.processTemplateStep.update({
              where: { id: s.id },
              data: {
                name: s.name,
                stepOrder: s.stepOrder,
                stepType: s.stepType,
              },
            });
            stepIdMap.set(s.id, updatedStep.id);
            stepIdMap.set(`order-${s.stepOrder}`, updatedStep.id);
          } else {
            const createdStep = await tx.processTemplateStep.create({
              data: {
                templateId: req.params.id,
                companyId: req.user.companyId,
                name: s.name,
                stepOrder: s.stepOrder,
                stepType: s.stepType,
                onRejectGotoStepId: null,
              },
            });
            if (s.id) stepIdMap.set(s.id, createdStep.id);
            stepIdMap.set(`order-${s.stepOrder}`, createdStep.id);
          }
        }

        // Delete removed steps safely
        const incomingIds = new Set(formattedSteps.map((s) => s.id).filter(Boolean));
        const toDelete = existingSteps.filter((es) => !incomingIds.has(es.id));
        for (const delStep of toDelete) {
          try {
            await tx.processTemplateStep.delete({ where: { id: delStep.id } });
          } catch (_) {
            // Preserves step if already referenced in execution history
          }
        }

        // Phase 2: Resolve and update onRejectGotoStepId loopback links
        for (let i = 0; i < formattedSteps.length; i++) {
          const s = formattedSteps[i];
          const currentDbId = stepIdMap.get(s.id) || stepIdMap.get(`order-${s.stepOrder}`);
          if (!currentDbId) continue;

          let targetDbId = null;
          if (s.onRejectGotoStepId) {
            targetDbId = stepIdMap.get(s.onRejectGotoStepId) || s.onRejectGotoStepId;
          } else if (s.onRejectGotoStepOrder) {
            targetDbId = stepIdMap.get(`order-${s.onRejectGotoStepOrder}`);
          }

          if (targetDbId && targetDbId !== currentDbId) {
            try {
              await tx.processTemplateStep.update({
                where: { id: currentDbId },
                data: { onRejectGotoStepId: targetDbId },
              });
            } catch (_) {}
          }
        }
      }

      return tx.processTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(version !== undefined ? { version: Number(version) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: { onRejectGotoStep: true },
          },
          instances: true,
        },
      });
    });

    try {
      await createProcessAuditLog({
        companyId: req.user.companyId,
        templateId: updated.id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { name: existing.name, isActive: existing.isActive },
        newValue: { name: updated.name, isActive: updated.isActive },
      });
    } catch (auditErr) {
      console.warn('Process audit log error on update template:', auditErr?.message);
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /process-templates/:id & /processes/templates/:id
 * Deletes a process template.
 */
export async function deleteTemplate(req, res, next) {
  try {
    const existing = await prisma.processTemplate.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    await prisma.processTemplate.delete({
      where: { id: req.params.id },
    });

    try {
      await createProcessAuditLog({
        companyId: req.user.companyId,
        templateId: null,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { templateId: existing.id, name: existing.name, version: existing.version },
      });
    } catch (auditErr) {
      console.warn('Process audit log error on delete template:', auditErr?.message);
    }

    res.status(200).json({
      success: true,
      message: 'Process template deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /processes/templates/:id/steps
 */
export async function listTemplateSteps(req, res, next) {
  try {
    const template = await prisma.processTemplate.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!template) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    const steps = await prisma.processTemplateStep.findMany({
      where: { templateId: req.params.id },
      include: { onRejectGotoStep: true },
      orderBy: { stepOrder: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: steps,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /processes/templates/:id/steps
 */
export async function addTemplateStep(req, res, next) {
  try {
    const template = await prisma.processTemplate.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!template) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    validateRequired(req.body, ['name', 'stepOrder']);
    validateNumber(req.body.stepOrder, 'stepOrder');

    if (req.body.stepType) {
      validateEnum(req.body.stepType, ALLOWED_STEP_TYPES, 'stepType');
    }

    const step = await prisma.processTemplateStep.create({
      data: {
        companyId: req.user.companyId,
        templateId: req.params.id,
        name: req.body.name.trim(),
        stepOrder: Number(req.body.stepOrder),
        stepType: req.body.stepType || 'Automated_Task',
        onRejectGotoStepId: req.body.onRejectGotoStepId ?? null,
      },
      include: { onRejectGotoStep: true },
    });

    res.status(201).json({
      success: true,
      data: step,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 2. PROCESS INSTANCES ENDPOINTS
// ============================================================================

/**
 * GET /process-instances & /processes/instances
 * Lists tenant-scoped process instances.
 */
export async function listInstances(req, res, next) {
  try {
    const { templateId, projectId } = req.query;

    const instances = await prisma.processInstance.findMany({
      where: {
        companyId: req.user.companyId,
        ...(templateId ? { templateId: String(templateId) } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
      include: {
        template: { select: { id: true, name: true, version: true } },
        project: { select: { id: true, name: true } },
        steps: {
          include: {
            templateStep: true,
            assignedTo: { select: { id: true, fullName: true, email: true } },
            actionedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { templateStep: { stepOrder: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: instances,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /process-instances/:id & /processes/instances/:id
 * Retrieves a single process instance with template, project, and steps.
 */
export async function getInstance(req, res, next) {
  try {
    const instance = await prisma.processInstance.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
      include: {
        template: { select: { id: true, name: true, version: true } },
        project: { select: { id: true, name: true } },
        steps: {
          include: {
            templateStep: true,
            assignedTo: { select: { id: true, fullName: true, email: true } },
            actionedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { templateStep: { stepOrder: 'asc' } },
        },
      },
    });

    if (!instance) {
      throw new NotFoundError(`Process instance ${req.params.id} not found`);
    }

    res.status(200).json({
      success: true,
      data: instance,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /process-instances & /processes/instances
 * Instantiates a process from a template, creating all instance steps.
 */
export async function createInstance(req, res, next) {
  try {
    const { templateId, projectId, status } = req.body;
    validateRequired(req.body, ['templateId']);

    const template = await prisma.processTemplate.findFirst({
      where: {
        id: templateId,
        companyId: req.user.companyId,
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    if (!template) {
      throw new NotFoundError(`Process template ${templateId} not found`);
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId: req.user.companyId,
        },
      });
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }
    }

    if (status) {
      validateEnum(status, ALLOWED_INSTANCE_STATUSES, 'status');
    }

    const createdInstance = await prisma.$transaction(async (tx) => {
      const instance = await tx.processInstance.create({
        data: {
          companyId: req.user.companyId,
          templateId: template.id,
          title: req.body.title?.trim() || `${template.name} - Instance #${Date.now().toString().slice(-4)}`,
          projectId: projectId ?? null,
          status: status || (template.steps.length > 0 ? 'Active' : 'Draft'),
          initiatedById: req.user.id,
        },
      });

      let firstStepId = null;
      for (let i = 0; i < template.steps.length; i++) {
        const tStep = template.steps[i];
        const instStep = await tx.processInstanceStep.create({
          data: {
            companyId: req.user.companyId,
            processInstanceId: instance.id,
            templateStepId: tStep.id,
            status: 'Pending',
          },
        });
        if (i === 0) {
          firstStepId = instStep.id;
        }
      }

      if (firstStepId) {
        return tx.processInstance.update({
          where: { id: instance.id },
          data: {
            currentStepId: firstStepId,
            status: 'Active',
          },
          include: {
            template: { select: { id: true, name: true, version: true } },
            project: { select: { id: true, name: true } },
            steps: {
              include: {
                templateStep: true,
                assignedTo: { select: { id: true, fullName: true, email: true } },
                actionedBy: { select: { id: true, fullName: true, email: true } },
              },
              orderBy: { templateStep: { stepOrder: 'asc' } },
            },
          },
        });
      }

      return tx.processInstance.findUnique({
        where: { id: instance.id },
        include: {
          template: { select: { id: true, name: true, version: true } },
          project: { select: { id: true, name: true } },
          steps: {
            include: {
              templateStep: true,
              assignedTo: { select: { id: true, fullName: true, email: true } },
              actionedBy: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { templateStep: { stepOrder: 'asc' } },
          },
        },
      });
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { templateId: template.id, status: createdInstance.status },
      });
    } catch (auditErr) {
      console.warn('Audit log error on create instance:', auditErr?.message);
    }

    res.status(201).json({
      success: true,
      data: createdInstance,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /process-instances/:id & /processes/instances/:id
 * Updates instance status (e.g., Cancelled, Completed, Active).
 */
export async function updateInstance(req, res, next) {
  try {
    const existing = await prisma.processInstance.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Process instance ${req.params.id} not found`);
    }

    const { status, projectId } = req.body;
    if (status) {
      validateEnum(status, ALLOWED_INSTANCE_STATUSES, 'status');
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: req.user.companyId },
      });
      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }
    }

    const completedAt =
      status === 'Completed' || status === 'Cancelled' || status === 'Rejected'
        ? new Date()
        : status === 'Active'
        ? null
        : existing.completedAt;

    const updated = await prisma.processInstance.update({
      where: { id: req.params.id },
      data: {
        ...(status ? { status, completedAt } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
      include: {
        template: { select: { id: true, name: true, version: true } },
        project: { select: { id: true, name: true } },
        steps: {
          include: {
            templateStep: true,
            assignedTo: { select: { id: true, fullName: true, email: true } },
            actionedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { templateStep: { stepOrder: 'asc' } },
        },
      },
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
      });
    } catch (auditErr) {
      console.warn('Audit log error on update instance:', auditErr?.message);
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /process-instances/:id & /processes/instances/:id
 * Deletes a process instance and associated steps.
 */
export async function deleteInstance(req, res, next) {
  try {
    const existing = await prisma.processInstance.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Process instance ${req.params.id} not found`);
    }

    await prisma.processInstanceStep.deleteMany({
      where: { processInstanceId: req.params.id },
    });

    await prisma.processInstance.delete({
      where: { id: req.params.id },
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { status: existing.status },
      });
    } catch (auditErr) {
      console.warn('Audit log error on delete instance:', auditErr?.message);
    }

    res.status(200).json({
      success: true,
      message: 'Process instance deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 3. PROCESS INSTANCE STEPS & ACTIONS ENDPOINTS
// ============================================================================


/**
 * GET /process-instance-steps & /processes/steps
 * Lists steps optionally filtered by processInstanceId.
 */
export async function listSteps(req, res, next) {
  try {
    const { processInstanceId } = req.query;

    const steps = await prisma.processInstanceStep.findMany({
      where: {
        processInstance: { companyId: req.user.companyId },
        ...(processInstanceId ? { processInstanceId: String(processInstanceId) } : {}),
      },
      include: {
        templateStep: { include: { onRejectGotoStep: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        actionedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { templateStep: { stepOrder: 'asc' } },
    });

    res.status(200).json({
      success: true,
      data: steps,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /process-instance-steps/:id & /processes/steps/:id
 */
export async function getStep(req, res, next) {
  try {
    const step = await prisma.processInstanceStep.findFirst({
      where: {
        id: req.params.id,
        processInstance: { companyId: req.user.companyId },
      },
      include: {
        templateStep: { include: { onRejectGotoStep: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        actionedBy: { select: { id: true, fullName: true, email: true } },
        processInstance: true,
      },
    });

    if (!step) {
      throw new NotFoundError(`Process instance step ${req.params.id} not found`);
    }

    res.status(200).json({
      success: true,
      data: step,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /process-instance-steps & /processes/steps
 */
export async function createStep(req, res, next) {
  try {
    const { processInstanceId, templateStepId, assignedToId, status } = req.body;
    validateRequired(req.body, ['processInstanceId', 'templateStepId']);

    const instance = await prisma.processInstance.findFirst({
      where: { id: processInstanceId, companyId: req.user.companyId },
    });
    if (!instance) {
      throw new NotFoundError(`Process instance ${processInstanceId} not found`);
    }

    const templateStep = await prisma.processTemplateStep.findFirst({
      where: { id: templateStepId, templateId: instance.templateId },
    });
    if (!templateStep) {
      throw new NotFoundError(`Template step ${templateStepId} not found`);
    }

    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: req.user.companyId },
      });
      if (!user) {
        throw new NotFoundError(`Assigned user ${assignedToId} not found`);
      }
    }

    if (status) {
      validateEnum(status, ALLOWED_STEP_STATUSES, 'status');
    }

    const step = await prisma.processInstanceStep.create({
      data: {
        companyId: req.user.companyId,
        processInstanceId,
        templateStepId,
        assignedToId: assignedToId ?? null,
        status: status || 'Pending',
      },
      include: {
        templateStep: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: step,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /process-instance-steps/:id & /processes/steps/:id/action
 * Handles Step Actions (Approval, Rejection, Skip) with State Machine Transitions.
 */
export async function actionStep(req, res, next) {
  try {
    const { status, assignedToId } = req.body;

    const currentStep = await prisma.processInstanceStep.findFirst({
      where: {
        id: req.params.id,
        processInstance: { companyId: req.user.companyId },
      },
      include: {
        templateStep: { include: { onRejectGotoStep: true } },
        processInstance: true,
      },
    });

    if (!currentStep) {
      throw new NotFoundError(`Process step ${req.params.id} not found`);
    }

    if (status) {
      validateEnum(status, ALLOWED_STEP_STATUSES, 'status');
    }

    // Role check: If step assigned to another user, regular Team Member cannot action it
    const isOwnerOrManager = req.user.role === ROLES.COMPANY_OWNER ||
      req.user.role === ROLES.SYSTEM_ADMIN ||
      req.user.role === ROLES.PROCESS_ADMIN ||
      req.user.role === ROLES.PROJECT_MANAGER;

    if (currentStep.assignedToId && currentStep.assignedToId !== req.user.id && !isOwnerOrManager) {
      throw new ForbiddenError('You are not authorized to action a step assigned to another user');
    }

    if (assignedToId !== undefined && assignedToId !== null) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: req.user.companyId },
      });
      if (!user) {
        throw new NotFoundError(`Assigned user ${assignedToId} not found`);
      }
    }

    const newStatus = status || currentStep.status;

    const result = await prisma.$transaction(async (tx) => {
      const updatedStep = await tx.processInstanceStep.update({
        where: { id: req.params.id },
        data: {
          status: newStatus,
          actionedById: req.user.id,
          actionedAt: new Date(),
          ...(assignedToId !== undefined ? { assignedToId } : {}),
        },
        include: {
          templateStep: { include: { onRejectGotoStep: true } },
          assignedTo: { select: { id: true, fullName: true, email: true } },
          actionedBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      // State Machine Transition Logic
      if (newStatus === 'Rejected') {
        if (currentStep.templateStep.onRejectGotoStepId) {
          // Loop-back target
          const targetTemplateStepId = currentStep.templateStep.onRejectGotoStepId;
          const targetInstanceStep = await tx.processInstanceStep.findFirst({
            where: {
              processInstanceId: currentStep.processInstanceId,
              templateStepId: targetTemplateStepId,
            },
          });

          if (targetInstanceStep) {
            await tx.processInstanceStep.update({
              where: { id: targetInstanceStep.id },
              data: { status: 'Pending' },
            });

            await tx.processInstance.update({
              where: { id: currentStep.processInstanceId },
              data: {
                currentStepId: targetInstanceStep.id,
                status: 'Active',
              },
            });
          }
        } else {
          // No loopback -> Mark entire instance as Rejected
          await tx.processInstance.update({
            where: { id: currentStep.processInstanceId },
            data: {
              status: 'Rejected',
              completedAt: new Date(),
            },
          });
        }
      } else if (newStatus === 'Approved' || newStatus === 'Skipped') {
        // Find next template step by stepOrder
        const nextTemplateStep = await tx.processTemplateStep.findFirst({
          where: {
            templateId: currentStep.templateStep.templateId,
            stepOrder: { gt: currentStep.templateStep.stepOrder },
          },
          orderBy: { stepOrder: 'asc' },
        });

        if (nextTemplateStep) {
          const nextInstanceStep = await tx.processInstanceStep.findFirst({
            where: {
              processInstanceId: currentStep.processInstanceId,
              templateStepId: nextTemplateStep.id,
            },
          });

          if (nextInstanceStep) {
            await tx.processInstance.update({
              where: { id: currentStep.processInstanceId },
              data: {
                currentStepId: nextInstanceStep.id,
                status: 'Active',
              },
            });
          }
        } else {
          // Final step reached -> Mark instance as Completed
          await tx.processInstance.update({
            where: { id: currentStep.processInstanceId },
            data: {
              status: 'Completed',
              completedAt: new Date(),
            },
          });
        }
      }

      return updatedStep;
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { status: currentStep.status },
        newValue: { status: result.status },
      });
    } catch (auditErr) {
      console.warn('Audit log error on action step:', auditErr?.message);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

