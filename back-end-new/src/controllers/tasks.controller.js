import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { validateRequired, validateEnum, validateNumber } from '../utils/validation.js';
import { ROLES } from '../utils/roles.js';
import {
  buildTaskListWhere,
  assertBranchManagerScope,
  isBranchManager,
} from '../utils/tenantScope.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { evaluateTaskTransition } from '../services/compliance.service.js';


const ALLOWED_TASK_STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled'];
const ALLOWED_TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const ALLOWED_ESCALATION_STATUSES = ['Open', 'Reviewed', 'Resolved', 'Closed'];

// ============================================================================
// 1. TASKS ENDPOINTS
// ============================================================================

/**
 * GET /tasks & GET /api/tasks
 * Lists tenant-scoped tasks with role-based filtering (e.g. member assigned only).
 */
export async function listTasks(req, res, next) {
  try {
    const where = buildTaskListWhere({
      companyId: req.user.companyId,
      branchId: req.query.branchId,
      user: req.user,
    });

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          include: {
            team: {
              include: {
                branch: { select: { id: true, name: true, companyId: true } },
              },
            },
          },
        },
        assignedTo: { select: { id: true, fullName: true, email: true, jobTitle: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        subtasks: { where: { deletedAt: null } },
        escalations: { where: { status: 'Open' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tasks/assignee/:userId & GET /api/tasks/assignee/:userId
 * Retrieves tasks assigned to a specific user within the caller's company.
 */
export async function listTasksByAssignee(req, res, next) {
  try {
    const { userId } = req.params;

    const tasks = await prisma.task.findMany({
      where: {
        companyId: req.user.companyId,
        assignedToId: userId,
        deletedAt: null,
      },
      include: {
        project: {
          include: {
            team: {
              include: {
                branch: { select: { id: true, name: true, companyId: true } },
              },
            },
          },
        },
        subtasks: { where: { deletedAt: null } },
        escalations: { where: { status: 'Open' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tasks/:id & GET /api/tasks/:id
 * Retrieves a single task by ID within caller's company.
 */
export async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
        deletedAt: null,
      },
      include: {
        project: {
          include: {
            team: {
              include: {
                branch: { select: { id: true, name: true, companyId: true } },
              },
            },
          },
        },
        assignedTo: { select: { id: true, fullName: true, email: true, jobTitle: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        subtasks: { where: { deletedAt: null } },
        escalations: true,
      },
    });

    if (!task) {
      throw new NotFoundError(`Task with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      const branchId = task.project?.team?.branchId;
      if (branchId) {
        assertBranchManagerScope(req.user, branchId, 'view this task');
      }
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /tasks & POST /api/tasks
 * Creates a new task under a company project.
 */
export async function createTask(req, res, next) {
  try {
    const body = req.body || {};
    const title = (body.title || '').trim();
    const description = body.description || null;
    const projectId = body.projectId || body.project_id || null;
    const status = body.status || 'Draft';
    const priority = body.priority || 'Medium';
    const assignedToId = body.assignedToId || body.assigned_to_id || null;
    const dueDate = body.dueDate || body.due_date || null;
    const estimatedHours = body.estimatedHours || body.estimated_hours || null;

    validateRequired({ title }, ['title']);
    validateEnum(status, ALLOWED_TASK_STATUSES, 'status');
    validateEnum(priority, ALLOWED_TASK_PRIORITIES, 'priority');

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          team: { branch: { companyId: req.user.companyId } },
        },
        include: { team: { select: { branchId: true } } },
      });

      if (!project) {
        throw new NotFoundError(`Project ${projectId} not found in this company`);
      }

      if (isBranchManager(req.user)) {
        assertBranchManagerScope(req.user, project.team?.branchId, 'create tasks in');
      }
    }

    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: req.user.companyId },
      });
      if (!assignee) {
        throw new BadRequestError('Assigned user does not belong to this company');
      }
    }

    const newTask = await prisma.task.create({
      data: {
        companyId: req.user.companyId,
        projectId,
        title,
        description,
        status,
        priority,
        assignedToId,
        createdById: req.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        project: true,
      },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        taskId: newTask.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { title: newTask.title, status: newTask.status, priority: newTask.priority },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during task creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /tasks/:id & PATCH /api/tasks/:id
 * Updates task fields, assignment, or status.
 */
export async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.task.findFirst({
      where: { id, companyId: req.user.companyId, deletedAt: null },
      include: { project: { include: { team: true } } },
    });

    if (!existing) {
      throw new NotFoundError(`Task with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      const branchId = existing.project?.team?.branchId;
      if (branchId) {
        assertBranchManagerScope(req.user, branchId, 'modify tasks in');
      }
    }

    const updateData = {};
    if (body.title) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) {
      validateEnum(body.status, ALLOWED_TASK_STATUSES, 'status');
      updateData.status = body.status;
      if (body.status === 'Completed') {
        updateData.completedAt = new Date();
      }
    }
    if (body.priority) {
      validateEnum(body.priority, ALLOWED_TASK_PRIORITIES, 'priority');
      updateData.priority = body.priority;
    }
    if (body.assignedToId !== undefined || body.assigned_to_id !== undefined) {
      const assigneeId = body.assignedToId !== undefined ? body.assignedToId : body.assigned_to_id;
      if (assigneeId) {
        const assignee = await prisma.user.findFirst({
          where: { id: assigneeId, companyId: req.user.companyId },
        });
        if (!assignee) {
          throw new BadRequestError('Target assignee does not belong to this company');
        }
      }
      updateData.assignedToId = assigneeId || null;
    }
    if (body.dueDate !== undefined || body.due_date !== undefined) {
      const d = body.dueDate !== undefined ? body.dueDate : body.due_date;
      updateData.dueDate = d ? new Date(d) : null;
    }
    if (body.actualHours !== undefined || body.actual_hours !== undefined) {
      const hours = body.actualHours !== undefined ? body.actualHours : body.actual_hours;
      updateData.actualHours = Number(hours);
    }

    // 🔴 THE INTERCEPTOR: Evaluate Compliance Before Saving
    if (updateData.status && updateData.status !== existing.status) {
      const evaluation = await evaluateTaskTransition(id, existing.projectId, updateData);

      if (!evaluation.allowed) {
        // 1. Auto-generate Violations in the Database
        const violationObjects = [];
        for (const rule of evaluation.failedRules) {
          // Create violation if one doesn't exist for this specific entity and rule
          // In a real app we might want to check if an open violation already exists
          const existingViolation = await prisma.complianceViolation.findFirst({
            where: {
              ruleId: rule.id,
              entityType: 'Task',
              entityId: id,
              status: 'Open'
            }
          });

          if (!existingViolation) {
            const v = await prisma.complianceViolation.create({
              data: {
                companyId: req.user.companyId,
                ruleId: rule.id,
                entityType: 'Task',
                entityId: id,
                status: 'Open',
                severity: rule.severity || 'Medium'
              }
            });
            violationObjects.push(v);
          } else {
            violationObjects.push(existingViolation);
          }
        }

        // 2. Block the transition and return 403 Forbidden to the Frontend
        return res.status(403).json({
          success: false,
          error: "COMPLIANCE_BLOCK",
          message: "This transition is blocked by active compliance rules.",
          violations: evaluation.failedRules
        });
      }
    }

    // 🟢 IF ALLOWED: Proceed with normal Prisma update
    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        project: true,
      },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        taskId: id,
        action: body.status && body.status !== existing.status ? AUDIT_ACTIONS.STATUS_CHANGE : AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { status: existing.status, title: existing.title },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during task update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /tasks/:id & DELETE /api/tasks/:id
 * Soft-deletes a task (`deletedAt: new Date()`).
 */
export async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findFirst({
      where: { id, companyId: req.user.companyId, deletedAt: null },
      include: { project: { include: { team: true } } },
    });

    if (!existing) {
      throw new NotFoundError(`Task with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      const branchId = existing.project?.team?.branchId;
      if (branchId) {
        assertBranchManagerScope(req.user, branchId, 'delete tasks in');
      }
    }

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        taskId: id,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { title: existing.title },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during task deletion:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 2. SUBTASKS ENDPOINTS
// ============================================================================

/**
 * GET /subtasks & GET /api/subtasks
 * Lists subtasks in caller's company.
 */
export async function listSubtasks(req, res, next) {
  try {
    const subtasks = await prisma.subtask.findMany({
      where: {
        companyId: req.user.companyId,
        deletedAt: null,
      },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: subtasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subtasks/by-task/:taskId & GET /api/subtasks/by-task/:taskId
 * Lists subtasks for a specific parent task.
 */
export async function listSubtasksByTask(req, res, next) {
  try {
    const { taskId } = req.params;

    const subtasks = await prisma.subtask.findMany({
      where: {
        taskId,
        companyId: req.user.companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: subtasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subtasks/:id & GET /api/subtasks/:id
 * Retrieves a single subtask.
 */
export async function getSubtaskById(req, res, next) {
  try {
    const { id } = req.params;

    const subtask = await prisma.subtask.findFirst({
      where: { id, companyId: req.user.companyId, deletedAt: null },
      include: { task: true },
    });

    if (!subtask) {
      throw new NotFoundError(`Subtask with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: subtask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subtasks & POST /api/subtasks
 * Creates a subtask under a company task.
 */
export async function createSubtask(req, res, next) {
  try {
    const body = req.body || {};
    const taskId = body.taskId || body.task_id;
    const title = (body.title || '').trim();
    const description = body.description || null;
    const status = body.status || 'Draft';
    const dueDate = body.dueDate || body.due_date || null;

    validateRequired({ taskId, title }, ['taskId', 'title']);
    validateEnum(status, ALLOWED_TASK_STATUSES, 'status');

    // Verify parent task belongs to caller company
    const parentTask = await prisma.task.findFirst({
      where: { id: taskId, companyId: req.user.companyId, deletedAt: null },
    });

    if (!parentTask) {
      throw new NotFoundError(`Parent task ${taskId} not found in this company`);
    }

    const assignedToId = body.assignedToId || body.assigned_to_id || body.assignedTo || null;

    const subtask = await prisma.subtask.create({
      data: {
        companyId: req.user.companyId,
        taskId,
        title,
        description,
        status,
        assignedToId,
        createdById: req.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Subtask created successfully',
      data: subtask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /subtasks/:id & PATCH /api/subtasks/:id
 * Updates subtask status or title.
 */
export async function updateSubtask(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.subtask.findFirst({
      where: { id, companyId: req.user.companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Subtask with ID ${id} not found`);
    }

    const updateData = {};
    if (body.title) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) {
      validateEnum(body.status, ALLOWED_TASK_STATUSES, 'status');
      updateData.status = body.status;
    }

    const updated = await prisma.subtask.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Subtask updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /subtasks/:id & DELETE /api/subtasks/:id
 * Soft deletes subtask.
 */
export async function deleteSubtask(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.subtask.findFirst({
      where: { id, companyId: req.user.companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Subtask with ID ${id} not found`);
    }

    await prisma.subtask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Subtask deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 3. ESCALATIONS ENDPOINTS
// ============================================================================

/**
 * GET /escalations & GET /api/escalations
 * Lists escalations in caller company.
 */
export async function listEscalations(req, res, next) {
  try {
    const escalations = await prisma.escalation.findMany({
      where: { companyId: req.user.companyId },
      include: {
        task: { select: { id: true, title: true, status: true } },
        project: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
        targetManager: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: escalations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /escalations/:id & GET /api/escalations/:id
 * Retrieves single escalation.
 */
export async function getEscalationById(req, res, next) {
  try {
    const { id } = req.params;

    const escalation = await prisma.escalation.findFirst({
      where: { id, companyId: req.user.companyId },
      include: {
        task: true,
        project: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        targetManager: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!escalation) {
      throw new NotFoundError(`Escalation with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: escalation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /escalations & POST /api/escalations
 * Creates an escalation.
 */
export async function createEscalation(req, res, next) {
  try {
    const body = req.body || {};
    const title = (body.title || '').trim();
    const description = body.description || null;
    const taskId = body.taskId || body.task_id || null;
    const projectId = body.projectId || body.project_id || null;
    const blockerType = body.blockerType || body.blocker_type || null;
    const priority = body.priority || 'High';

    validateRequired({ title }, ['title']);

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, companyId: req.user.companyId },
      });
      if (!task) throw new NotFoundError(`Task ${taskId} not found in this company`);
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, team: { branch: { companyId: req.user.companyId } } },
      });
      if (!project) throw new NotFoundError(`Project ${projectId} not found in this company`);
    }

    const escalation = await prisma.escalation.create({
      data: {
        companyId: req.user.companyId,
        taskId,
        projectId,
        title,
        description,
        blockerType,
        priority,
        reportedById: req.user.id,
        status: 'Open',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Escalation created successfully',
      data: escalation,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /escalations/:id & PATCH /api/escalations/:id
 * Updates escalation status or resolution.
 */
export async function updateEscalation(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.escalation.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Escalation with ID ${id} not found`);
    }

    const updateData = {};
    if (body.status) {
      validateEnum(body.status, ALLOWED_ESCALATION_STATUSES, 'status');
      updateData.status = body.status;
      if (body.status === 'Resolved' || body.status === 'Closed') {
        updateData.resolvedAt = new Date();
      }
    }
    if (body.description) updateData.description = body.description;

    const updated = await prisma.escalation.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Escalation updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /escalations/:id & DELETE /api/escalations/:id
 * Deletes an escalation.
 */
export async function deleteEscalation(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.escalation.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Escalation with ID ${id} not found`);
    }

    await prisma.escalation.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Escalation deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

