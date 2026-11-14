import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired, validateEnum, validateNumber } from '../utils/validation.js';
import { ROLES, hasRole, normalizeRole } from '../utils/roles.js';
import { assertWithinPlanLimit } from '../utils/planLimits.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { evaluateTaskTransition } from '../services/compliance.service.js';


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
// SHARED RESOURCE INCLUDES (PRE-M4-01 / BD11)
// ============================================================================

export const PROCESS_TEMPLATE_INCLUDE = {
  steps: {
    orderBy: { stepOrder: 'asc' },
    include: { onRejectGotoStep: true },
  },
  instances: {
    select: { id: true, status: true, title: true, createdAt: true },
  },
  _count: {
    select: { instances: true, steps: true },
  },
};

export const PROCESS_INSTANCE_INCLUDE = {
  template: { select: { id: true, name: true, version: true } },
  project: { select: { id: true, name: true } },
  steps: {
    include: {
      templateStep: { include: { onRejectGotoStep: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      actionedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { templateStep: { stepOrder: 'asc' } },
  },
};

export const PROCESS_STEP_INCLUDE = {
  templateStep: { include: { onRejectGotoStep: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  actionedBy: { select: { id: true, fullName: true, email: true } },
};

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
      include: PROCESS_TEMPLATE_INCLUDE,
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
      include: PROCESS_TEMPLATE_INCLUDE,
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
          const currentOrder = s.stepOrder ?? index + 1;
          if (typeof s === 'string') {
            return {
              companyId: req.user.companyId,
              stepOrder: currentOrder,
              name: s,
              stepType: 'Automated_Task',
              onRejectGotoStepId: null,
              onRejectGotoStepOrder: null,
            };
          }
          if (s.stepType) {
            validateEnum(s.stepType, ALLOWED_STEP_TYPES, `steps[${index}].stepType`);
          }

          // SEC-M4-07: Validate onRejectGotoStepOrder points to an earlier step
          if (s.onRejectGotoStepOrder !== undefined && s.onRejectGotoStepOrder !== null) {
            const targetOrder = Number(s.onRejectGotoStepOrder);
            if (targetOrder >= currentOrder) {
              throw new BadRequestError(
                `Reject loopback target step order (${targetOrder}) on step "${s.name || index + 1}" must precede current step order (${currentOrder})`
              );
            }
          }

          return {
            companyId: req.user.companyId,
            stepOrder: currentOrder,
            name: s.name || `Step ${index + 1}`,
            stepType: s.stepType || 'Automated_Task',
            onRejectGotoStepId: s.onRejectGotoStepId ?? null,
            onRejectGotoStepOrder: s.onRejectGotoStepOrder ?? null,
          };
        })
      : [];

    if (isActive === undefined || Boolean(isActive)) {
      await assertWithinPlanLimit(req.user.companyId, 'activeProcessTemplates');
    }

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.processTemplate.create({
        data: {
          companyId: req.user.companyId,
          name: name.trim(),
          version: version ? Number(version) : 1,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          createdById: req.user.id,
        },
      });

      if (formattedSteps.length > 0) {
        const stepOrderMap = new Map();
        for (const s of formattedSteps) {
          const step = await tx.processTemplateStep.create({
            data: {
              companyId: req.user.companyId,
              templateId: template.id,
              stepOrder: s.stepOrder,
              name: s.name,
              stepType: s.stepType,
              onRejectGotoStepId: null,
            },
          });
          stepOrderMap.set(s.stepOrder, step.id);
        }

        // Phase 2: Link loopbacks by stepOrder
        for (const s of formattedSteps) {
          if (s.onRejectGotoStepOrder) {
            const targetStepId = stepOrderMap.get(Number(s.onRejectGotoStepOrder));
            if (targetStepId) {
              const currentStepId = stepOrderMap.get(s.stepOrder);
              await tx.processTemplateStep.update({
                where: { id: currentStepId },
                data: { onRejectGotoStepId: targetStepId },
              });
            }
          }
        }
      }

      return tx.processTemplate.findUnique({
        where: { id: template.id },
        include: PROCESS_TEMPLATE_INCLUDE,
      });
    }, { timeout: 15000, maxWait: 5000 });

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

    if (isActive !== undefined && Boolean(isActive) && !existing.isActive) {
      await assertWithinPlanLimit(req.user.companyId, 'activeProcessTemplates');
    }

    // SEC-M4-04 & SEC-M4-07: Validate step constraints before starting transaction
    if (Array.isArray(steps)) {
      const activeInstancesCount = await prisma.processInstance.count({
        where: {
          templateId: req.params.id,
          companyId: req.user.companyId,
          status: 'Active',
        },
      });
      if (activeInstancesCount > 0) {
        throw new BadRequestError(
          `Cannot modify steps on process template "${existing.name}": ${activeInstancesCount} active process instance(s) are currently running. Complete or cancel active instances first, or create a new template version.`
        );
      }

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (typeof s === 'object' && s !== null) {
          if (s.stepType) {
            validateEnum(s.stepType, ALLOWED_STEP_TYPES, `steps[${i}].stepType`);
          }
          const currentOrder = s.stepOrder ?? (i + 1);
          if (s.onRejectGotoStepOrder !== undefined && s.onRejectGotoStepOrder !== null) {
            const targetOrder = Number(s.onRejectGotoStepOrder);
            if (targetOrder >= currentOrder) {
              throw new BadRequestError(
                `Reject loopback target step order (${targetOrder}) on step "${s.name || i + 1}" must precede current step order (${currentOrder})`
              );
            }
          }
        }
      }
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

        // Free positive stepOrder values to prevent unique constraint collisions (templateId, stepOrder)
        for (let i = 0; i < existingSteps.length; i++) {
          await tx.processTemplateStep.update({
            where: { id: existingSteps[i].id },
            data: { stepOrder: -(i + 1) },
          });
        }

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

        // Delete removed steps safely (nullify any loopback references first)
        const incomingIds = new Set(formattedSteps.map((s) => s.id).filter(Boolean));
        const toDelete = existingSteps.filter((es) => !incomingIds.has(es.id));
        const toDeleteIds = toDelete.map((es) => es.id);
        if (toDeleteIds.length > 0) {
          await tx.processTemplateStep.updateMany({
            where: { onRejectGotoStepId: { in: toDeleteIds } },
            data: { onRejectGotoStepId: null },
          });
        }
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

          if (targetDbId) {
            const targetStep = await tx.processTemplateStep.findFirst({
              where: { id: targetDbId, templateId: req.params.id },
            });
            if (targetStep) {
              if (targetStep.stepOrder >= s.stepOrder) {
                throw new BadRequestError(
                  `Reject loopback target step "${targetStep.name}" (order ${targetStep.stepOrder}) must precede current step "${s.name}" (order ${s.stepOrder})`
                );
              }
              await tx.processTemplateStep.update({
                where: { id: currentDbId },
                data: { onRejectGotoStepId: targetDbId },
              });
            }
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
        include: PROCESS_TEMPLATE_INCLUDE,
      });
    }, { timeout: 15000, maxWait: 5000 });

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
      include: {
        _count: {
          select: { instances: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError(`Process template ${req.params.id} not found`);
    }

    if (existing._count?.instances > 0) {
      throw new BadRequestError(
        'Cannot delete a process template with existing run instances. Archive it by setting isActive to false instead.'
      );
    }

    await prisma.$transaction(async (tx) => {
      // Break self-referencing step loopback FKs to prevent Postgres foreign key constraint errors
      await tx.processTemplateStep.updateMany({
        where: { templateId: req.params.id },
        data: { onRejectGotoStepId: null },
      });
      await tx.processTemplate.delete({
        where: { id: req.params.id },
      });
    }, { timeout: 15000, maxWait: 5000 });

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

    // SEC-M4-04: Block step additions when active instances exist
    const activeInstancesCount = await prisma.processInstance.count({
      where: {
        templateId: req.params.id,
        companyId: req.user.companyId,
        status: 'Active',
      },
    });
    if (activeInstancesCount > 0) {
      throw new BadRequestError(
        `Cannot add steps to process template "${template.name}": ${activeInstancesCount} active process instance(s) are currently running. Complete or cancel active instances first, or create a new template version.`
      );
    }

    validateRequired(req.body, ['name', 'stepOrder']);
    validateNumber(req.body.stepOrder, 'stepOrder');
    const stepOrder = Number(req.body.stepOrder);

    if (req.body.stepType) {
      validateEnum(req.body.stepType, ALLOWED_STEP_TYPES, 'stepType');
    }

    // SEC-M4-07: Validate reject loopback target precedes current step
    let onRejectGotoStepId = req.body.onRejectGotoStepId ?? null;
    if (onRejectGotoStepId) {
      const targetStep = await prisma.processTemplateStep.findFirst({
        where: {
          id: onRejectGotoStepId,
          templateId: req.params.id,
        },
      });
      if (!targetStep) {
        throw new NotFoundError(`Target reject step ${onRejectGotoStepId} not found`);
      }
      if (targetStep.stepOrder >= stepOrder) {
        throw new BadRequestError(
          `Reject loopback target step "${targetStep.name}" (order ${targetStep.stepOrder}) must precede current step (order ${stepOrder})`
        );
      }
    }

    const step = await prisma.processTemplateStep.create({
      data: {
        companyId: req.user.companyId,
        templateId: req.params.id,
        name: req.body.name.trim(),
        stepOrder,
        stepType: req.body.stepType || 'Automated_Task',
        onRejectGotoStepId,
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

    const isPrivileged = hasRole(req.user.role, [
      ...PROCESS_MANAGER_ROLES,
      ROLES.PLATFORM_ADMIN,
      'company_owner',
      'system_admin',
      'process_admin',
      'project_manager',
    ]);

    const where = {
      companyId: req.user.companyId,
      ...(templateId ? { templateId: String(templateId) } : {}),
      ...(projectId ? { projectId: String(projectId) } : {}),
    };

    // SEC-M4-08: Apply X2 scoping rule for regular team members
    if (!isPrivileged) {
      where.OR = [
        { initiatedById: req.user.id },
        { steps: { some: { assignedToId: req.user.id } } },
        { steps: { some: { actionedById: req.user.id } } },
      ];
    }

    const instances = await prisma.processInstance.findMany({
      where,
      include: PROCESS_INSTANCE_INCLUDE,
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
    const isPrivileged = hasRole(req.user.role, [
      ...PROCESS_MANAGER_ROLES,
      ROLES.PLATFORM_ADMIN,
      'company_owner',
      'system_admin',
      'process_admin',
      'project_manager',
    ]);

    const where = {
      id: req.params.id,
      companyId: req.user.companyId,
    };

    // SEC-M4-08: Apply X2 scoping rule for regular team members
    if (!isPrivileged) {
      where.OR = [
        { initiatedById: req.user.id },
        { steps: { some: { assignedToId: req.user.id } } },
        { steps: { some: { actionedById: req.user.id } } },
      ];
    }

    const instance = await prisma.processInstance.findFirst({
      where,
      include: PROCESS_INSTANCE_INCLUDE,
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

    if (!template.isActive) {
      throw new BadRequestError('Cannot launch an instance from an inactive template');
    }

    if (!template.steps || template.steps.length === 0) {
      throw new BadRequestError('Cannot launch an instance from a template that has no steps configured');
    }

    let project = null;
    if (projectId) {
      project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId: req.user.companyId,
        },
        select: { id: true, targetDate: true },
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
        if (project) {
          await tx.task.create({
            data: {
              companyId: req.user.companyId,
              projectId: project.id,
              processInstanceStepId: instStep.id,
              title: tStep.name,
              description: `Generated from the "${template.name}" workflow.`,
              status: 'Active',
              priority: 'Medium',
              createdById: req.user.id,
              dueDate: project.targetDate,
            },
          });
        }
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
          include: PROCESS_INSTANCE_INCLUDE,
        });
      }

      return tx.processInstance.findUnique({
        where: { id: instance.id },
        include: PROCESS_INSTANCE_INCLUDE,
      });
    }, { timeout: 15000, maxWait: 5000 });

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

    // SEC-M4-06: Valid status transitions enforcement
    if (status && status !== existing.status) {
      const TERMINAL_STATUSES = ['Completed', 'Cancelled', 'Rejected'];
      if (TERMINAL_STATUSES.includes(existing.status)) {
        throw new BadRequestError(`Cannot change status of an instance with terminal status "${existing.status}"`);
      }

      if (status === 'Completed') {
        const pendingStepsCount = await prisma.processInstanceStep.count({
          where: {
            processInstanceId: existing.id,
            status: 'Pending',
          },
        });
        if (pendingStepsCount > 0) {
          throw new BadRequestError(
            `Cannot mark process instance as Completed manually: ${pendingStepsCount} step(s) are still Pending`
          );
        }
      }

      const validTransitions = {
        Draft: ['Active', 'Cancelled'],
        Active: ['Cancelled', 'Completed'],
        Completed: [],
        Cancelled: [],
        Rejected: [],
      };

      const allowedNext = validTransitions[existing.status] || [];
      if (!allowedNext.includes(status)) {
        throw new BadRequestError(
          `Invalid status transition from "${existing.status}" to "${status}". Allowed next statuses: ${allowedNext.join(', ') || 'none (terminal)'}`
        );
      }
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
        : existing.completedAt;

    const updated = await prisma.processInstance.update({
      where: { id: req.params.id },
      data: {
        ...(status ? { status, completedAt } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
      include: PROCESS_INSTANCE_INCLUDE,
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

    await prisma.$transaction(async (tx) => {
      // Find all step IDs in this instance
      const steps = await tx.processInstanceStep.findMany({
        where: { processInstanceId: req.params.id },
        select: { id: true },
      });
      const stepIds = steps.map((s) => s.id);

      // Unlink any tasks created from these steps to prevent dangling references
      if (stepIds.length > 0) {
        await tx.task.updateMany({
          where: { processInstanceStepId: { in: stepIds } },
          data: { processInstanceStepId: null },
        });
      }

      await tx.processInstanceStep.deleteMany({
        where: { processInstanceId: req.params.id },
      });

      await tx.processInstance.delete({
        where: { id: req.params.id },
      });
    }, { timeout: 15000, maxWait: 5000 });

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

    const isPrivileged = hasRole(req.user.role, [
      ...PROCESS_MANAGER_ROLES,
      ROLES.PLATFORM_ADMIN,
      'company_owner',
      'system_admin',
      'process_admin',
      'project_manager',
    ]);

    const instanceWhere = {
      companyId: req.user.companyId,
    };

    // SEC-M4-08: Scope steps to accessible instances for members
    if (!isPrivileged) {
      instanceWhere.OR = [
        { initiatedById: req.user.id },
        { steps: { some: { assignedToId: req.user.id } } },
        { steps: { some: { actionedById: req.user.id } } },
      ];
    }

    const steps = await prisma.processInstanceStep.findMany({
      where: {
        processInstance: instanceWhere,
        ...(processInstanceId ? { processInstanceId: String(processInstanceId) } : {}),
      },
      include: PROCESS_STEP_INCLUDE,
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
    const isPrivileged = hasRole(req.user.role, [
      ...PROCESS_MANAGER_ROLES,
      ROLES.PLATFORM_ADMIN,
      'company_owner',
      'system_admin',
      'process_admin',
      'project_manager',
    ]);

    const instanceWhere = {
      companyId: req.user.companyId,
    };

    // SEC-M4-08: Scope step to accessible instances for members
    if (!isPrivileged) {
      instanceWhere.OR = [
        { initiatedById: req.user.id },
        { steps: { some: { assignedToId: req.user.id } } },
        { steps: { some: { actionedById: req.user.id } } },
      ];
    }

    const step = await prisma.processInstanceStep.findFirst({
      where: {
        id: req.params.id,
        processInstance: instanceWhere,
      },
      include: PROCESS_STEP_INCLUDE,
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

    const TERMINAL_STATUSES = ['Completed', 'Cancelled', 'Rejected'];
    if (TERMINAL_STATUSES.includes(instance.status)) {
      throw new BadRequestError(`Cannot add steps to an instance with terminal status "${instance.status}"`);
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
      include: PROCESS_STEP_INCLUDE,
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

    // Guard: Instance must be active to perform step transitions
    if (currentStep.processInstance.status !== 'Active') {
      throw new BadRequestError(`Cannot action steps on a ${currentStep.processInstance.status} instance`);
    }

    // Guard: Prevent double-click or re-actioning already resolved steps
    if (currentStep.status !== 'Pending') {
      throw new BadRequestError(`Step has already been actioned (status: ${currentStep.status})`);
    }

    // SEC-M4-05: Enforce sequence guard even when currentStepId is null
    let activeStepId = currentStep.processInstance.currentStepId;
    if (!activeStepId) {
      const firstPending = await prisma.processInstanceStep.findFirst({
        where: {
          processInstanceId: currentStep.processInstanceId,
          status: 'Pending',
        },
        include: { templateStep: true },
        orderBy: { templateStep: { stepOrder: 'asc' } },
      });
      if (!firstPending) {
        throw new BadRequestError('No pending steps remain in this process instance');
      }
      activeStepId = firstPending.id;
    }

    if (currentStep.id !== activeStepId) {
      throw new BadRequestError('Only the current active step in the workflow can be actioned');
    }

    if (status) {
      validateEnum(status, ALLOWED_STEP_STATUSES, 'status');
    }

    // Role check: If step assigned to another user, regular Team Member cannot action it.
    // If step is unassigned, only managers/admins can action it.
    const isOwnerOrManager = hasRole(req.user.role, [
      ...PROCESS_MANAGER_ROLES,
      ROLES.PLATFORM_ADMIN,
    ]);

    if (currentStep.assignedToId) {
      if (currentStep.assignedToId !== req.user.id && !isOwnerOrManager) {
        throw new ForbiddenError('You are not authorized to action a step assigned to another user');
      }
    } else if (!isOwnerOrManager) {
      throw new ForbiddenError('Only Process Administrators, Project Managers, or Admins can action unassigned steps');
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

    // SEC-M4-03: Evaluate compliance before marking linked tasks Completed
    if (newStatus === 'Approved') {
      const linkedTasks = await prisma.task.findMany({
        where: {
          processInstanceStepId: currentStep.id,
          companyId: req.user.companyId,
          deletedAt: null,
        },
        include: {
          project: {
            include: { team: true },
          },
        },
      });

      for (const linkedTask of linkedTasks) {
        const complianceCheck = await evaluateTaskTransition(linkedTask.id, linkedTask, { status: 'Completed' });
        if (!complianceCheck.allowed) {
          const failedRuleNames = (complianceCheck.failedRules || []).map((r) => r.name).join(', ');
          throw new ForbiddenError(
            `Cannot approve step: Linked task "${linkedTask.title}" failed compliance evaluation (${failedRuleNames || 'active compliance blocker'}). Required evidence or sign-off is missing.`
          );
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // SEC-M4-02: Atomic conditional update inside transaction to prevent double approval
      const updateResult = await tx.processInstanceStep.updateMany({
        where: {
          id: req.params.id,
          status: 'Pending',
        },
        data: {
          status: newStatus,
          actionedById: req.user.id,
          actionedAt: new Date(),
          ...(assignedToId !== undefined ? { assignedToId } : {}),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestError('Step has already been actioned or is no longer pending');
      }

      const updatedStep = await tx.processInstanceStep.findUnique({
        where: { id: req.params.id },
        include: PROCESS_STEP_INCLUDE,
      });

      // Synchronize linked Project Tasks
      if (newStatus === 'Approved') {
        await tx.task.updateMany({
          where: {
            processInstanceStepId: currentStep.id,
            companyId: req.user.companyId,
            deletedAt: null,
          },
          data: {
            status: 'Completed',
            completedAt: new Date(),
          },
        });
      } else if (newStatus === 'Rejected') {
        await tx.task.updateMany({
          where: {
            processInstanceStepId: currentStep.id,
            companyId: req.user.companyId,
            deletedAt: null,
          },
          data: {
            status: 'Blocked',
          },
        });
      }

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
            include: { templateStep: true },
          });

          if (targetInstanceStep) {
            // Reset target step and all intermediate steps up to current step back to Pending
            const allInstanceSteps = await tx.processInstanceStep.findMany({
              where: { processInstanceId: currentStep.processInstanceId },
              include: { templateStep: true },
            });

            const stepsToResetIds = allInstanceSteps
              .filter(
                (s) =>
                  s.templateStep.stepOrder >= targetInstanceStep.templateStep.stepOrder &&
                  s.templateStep.stepOrder <= currentStep.templateStep.stepOrder
              )
              .map((s) => s.id);

            if (stepsToResetIds.length > 0) {
              await tx.processInstanceStep.updateMany({
                where: { id: { in: stepsToResetIds } },
                data: {
                  status: 'Pending',
                  actionedById: null,
                  actionedAt: null,
                },
              });
            }

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
    }, { timeout: 15000, maxWait: 5000 });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { status: currentStep.status },
        newValue: { status: result.status, comment: req.body?.comment || undefined },
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
