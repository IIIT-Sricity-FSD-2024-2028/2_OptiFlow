import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { validateRequired, validateEnum, validateNumber } from '../utils/validation.js';
import { hasRole, normalizeRole, ROLES } from '../utils/roles.js';
import {
  buildTaskListWhere,
  buildSubtaskListWhere,
  assertBranchManagerScope,
  isBranchManager,
  isCompanyOwner,
  getAssignedProjectIds,
  getBranchScopeId,
} from '../utils/tenantScope.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { evaluateTaskTransition } from '../services/compliance.service.js';
import { assertCanManageProject } from './projects.controller.js';


const ALLOWED_TASK_STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled'];
const ALLOWED_TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const ALLOWED_ESCALATION_STATUSES = ['Open', 'Reviewed', 'Resolved', 'Closed'];
const ALLOWED_ESCALATION_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const OPEN_PROJECT_STATUSES = ['Planning', 'Active'];
const CLOSED_TASK_STATUSES = ['Completed', 'Cancelled'];
// Statuses a Team Member may set on their own work (D-S5).
const MEMBER_SETTABLE_STATUSES = ['Active', 'In_Review', 'Blocked'];

const TEAM_LEAD_ROLE_FILTER = {
  OR: [
    { label: ROLES.TEAM_LEAD },
    { label: 'Team Leader' },
    { name: 'team_lead' },
    { name: 'team_leader' },
    { roleTemplate: { slug: 'team_lead' } },
    { roleTemplate: { slug: 'team_leader' } },
  ],
};

// ---- caller role helpers -------------------------------------------------
function callerRole(user) {
  return normalizeRole(user?.roleLabel || user?.role);
}
function isMemberRole(user) {
  const role = callerRole(user);
  return role === 'team_member' || role === 'member';
}
function isTeamLeadRole(user) {
  return hasRole(user?.roleLabel || user?.role, [ROLES.TEAM_LEAD]);
}
function isProjectManagerRole(user) {
  return hasRole(user?.roleLabel || user?.role, [ROLES.PROJECT_MANAGER]);
}
function isCompanyAdmin(user) {
  return isCompanyOwner(user) || hasRole(user?.roleLabel || user?.role, [ROLES.SYSTEM_ADMIN]);
}
// PM, Branch Manager, Owner or System Admin: may approve and complete parent tasks.
function canApproveTasks(user) {
  return isProjectManagerRole(user) || isBranchManager(user) || isCompanyAdmin(user);
}

// Strict role check on a loaded role record (label, name or template slug).
function isTeamLeadRoleRecord(role) {
  if (!role) return false;
  return [role.label, role.name, role.roleTemplate?.slug].some(
    (value) => value && hasRole(value, [ROLES.TEAM_LEAD])
  );
}

function parseOptionalDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${field} must be a valid date`);
  }
  return date;
}

// Deadlines are compared by calendar day. The UTC day start is used so a
// date-only value ("YYYY-MM-DD", parsed as UTC midnight) for today passes.
function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function assertNotPast(date, field) {
  if (date && date < startOfTodayUtc()) {
    throw new BadRequestError(`${field} cannot be in the past`);
  }
}

function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

// A subtask must be due on or before its parent task's due date.
function assertWithinParentDeadline(subtaskDue, parentDue) {
  if (subtaskDue && parentDue && subtaskDue > parentDue) {
    throw new BadRequestError(`Subtask dueDate cannot be after the task due date (${formatDay(parentDue)})`);
  }
}

function parseOptionalHours(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new BadRequestError(`${field} must be a number of hours >= 0`);
  }
  return hours;
}

// Task/subtask scope with the PM's Project-scoped assignments included.
async function scopedTaskWhere(req, branchId) {
  return buildTaskListWhere({
    companyId: req.user.companyId,
    branchId,
    user: req.user,
    assignedProjectIds: await getAssignedProjectIds(prisma, req.user),
  });
}
async function scopedSubtaskWhere(req, branchId) {
  return buildSubtaskListWhere({
    companyId: req.user.companyId,
    branchId,
    user: req.user,
    assignedProjectIds: await getAssignedProjectIds(prisma, req.user),
  });
}

function withSubtaskProgress(task) {
  if (!task || !Array.isArray(task.subtasks)) return task;
  const total = task.subtasks.length;
  const completed = task.subtasks.filter((st) => st.status === 'Completed').length;
  return { ...task, subtaskProgress: { completed, total } };
}

// Server-side notifications (D-S12). Never blocks or fails the request.
function notify(companyId, userId, title, message, type = 'System') {
  if (!companyId || !userId) return;
  prisma.notification
    .create({ data: { companyId, userId, title, message, type } })
    .catch((err) => console.warn('[Notification] Notice:', err.message));
}

async function assertActiveTeamLead(companyId, userId, teamId) {
  const candidateUser = await prisma.user.findFirst({
    where: { id: userId, companyId, isActive: true },
    include: {
      teamMembers: { where: { teamId } },
      roleAssignments: {
        where: { revokedAt: null },
        include: { role: { include: { roleTemplate: true } } },
      },
    },
  });

  if (!candidateUser) {
    throw new NotFoundError('Selected Team Lead was not found or is inactive');
  }

  const hasTlRole = candidateUser.roleAssignments.some((ra) => isTeamLeadRoleRecord(ra.role));
  const isTeamLeadInTeam = candidateUser.teamMembers.some((tm) => /lead/i.test(tm.role || ''));

  if (!hasTlRole && !isTeamLeadInTeam) {
    throw new BadRequestError('The selected assignee must be a designated Team Lead');
  }
  return candidateUser;
}

async function resolveProjectTeamLead(project, companyId) {
  const memberships = await prisma.teamMember.findMany({
    where: { teamId: project.teamId },
    select: { userId: true, role: true },
  });
  const memberIds = memberships.map(({ userId }) => userId);

  const designatedLeadIds = memberships
    .filter(({ role }) => /team.?lead|^lead$/i.test(role || ''))
    .map(({ userId }) => userId);
  const candidateIds = designatedLeadIds.length > 0 ? designatedLeadIds : memberIds;

  const teamLeads = candidateIds.length === 0 ? [] : await prisma.user.findMany({
    where: {
      id: { in: candidateIds },
      companyId,
      isActive: true,
      roleAssignments: {
        some: {
          revokedAt: null,
          OR: [
            { scopeType: 'Company', scopeId: companyId },
            { scopeType: 'Branch', scopeId: project.team.branchId },
            { scopeType: 'Team', scopeId: project.teamId },
            { scopeType: 'Project', scopeId: project.id },
          ],
          role: TEAM_LEAD_ROLE_FILTER,
        },
      },
    },
    select: { id: true },
  });

  if (teamLeads.length !== 1) {
    throw new BadRequestError('The project team must have exactly one active Team Lead assigned before creating tasks');
  }

  return teamLeads[0];
}

// One include for list, create and update so every task response has the same shape.
const TASK_ITEM_INCLUDE = {
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
};

// ============================================================================
// 1. TASKS ENDPOINTS
// ============================================================================

/**
 * GET /tasks & GET /api/tasks
 * Lists tenant-scoped tasks with role-based filtering (e.g. member assigned only).
 */
export async function listTasks(req, res, next) {
  try {
    const where = await scopedTaskWhere(req, req.query.branchId);
    const subtaskScope = await scopedSubtaskWhere(req, req.query.branchId);

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
        subtasks: { where: subtaskScope },
        escalations: { where: { status: 'Open' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: tasks.map(withSubtaskProgress),
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
    const taskScope = await scopedTaskWhere(req);
    const subtaskScope = await scopedSubtaskWhere(req, req.query.branchId);

    const tasks = await prisma.task.findMany({
      where: {
        AND: [taskScope, { assignedToId: userId }],
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
        subtasks: { where: subtaskScope },
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
    const taskScope = await scopedTaskWhere(req);
    const subtaskScope = await scopedSubtaskWhere(req, req.query.branchId);

    const task = await prisma.task.findFirst({
      where: {
        ...taskScope,
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
        subtasks: { where: subtaskScope },
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
      data: withSubtaskProgress(task),
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
    const dueDate = parseOptionalDate(body.dueDate || body.due_date, 'dueDate');
    const estimatedHours = parseOptionalHours(body.estimatedHours ?? body.estimated_hours, 'estimatedHours');

    validateRequired({ title }, ['title']);
    validateEnum(status, ALLOWED_TASK_STATUSES, 'status');
    validateEnum(priority, ALLOWED_TASK_PRIORITIES, 'priority');
    assertNotPast(dueDate, 'dueDate');
    if (CLOSED_TASK_STATUSES.includes(status)) {
      throw new BadRequestError('A new task cannot start as Completed or Cancelled');
    }

    if (!projectId) {
      throw new BadRequestError('A project must be selected so the task can be assigned to its Team Lead');
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        team: { branch: { companyId: req.user.companyId } },
      },
      include: { team: { select: { id: true, branchId: true } } },
    });

    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found in this company`);
    }

    await assertCanManageProject(req, project, 'create tasks in this project');

    if (!OPEN_PROJECT_STATUSES.includes(project.status)) {
      throw new BadRequestError(`Tasks cannot be added to a project that is ${project.status}`);
    }

    let targetAssigneeId = null;
    if (assignedToId) {
      const candidateUser = await assertActiveTeamLead(req.user.companyId, assignedToId, project.teamId);
      targetAssigneeId = candidateUser.id;
    } else {
      const teamLead = await resolveProjectTeamLead(project, req.user.companyId);
      targetAssigneeId = teamLead.id;
    }

    const newTask = await prisma.task.create({
      data: {
        companyId: req.user.companyId,
        projectId,
        title,
        description,
        status,
        priority,
        assignedToId: targetAssigneeId,
        createdById: req.user.id,
        dueDate,
        estimatedHours,
      },
      include: TASK_ITEM_INCLUDE,
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

    notify(req.user.companyId, targetAssigneeId, 'New task assigned', `You have been assigned "${newTask.title}".`, 'Task');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: withSubtaskProgress(newTask),
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
      where: {
        ...await scopedTaskWhere(req),
        id,
        companyId: req.user.companyId,
      },
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

    const isMember = isMemberRole(req.user);
    const isTeamLead = isTeamLeadRole(req.user);
    const isAssignee = existing.assignedToId === req.user.id;
    const canApprove = canApproveTasks(req.user);

    // Only the task's assignee, or a leader / manager, may change a parent task.
    if (!canApprove && !isAssignee) {
      throw new ForbiddenError('Only the task assignee, its Team Lead or a manager can update this task');
    }

    // Governance: Team members can submit work (In_Review) or report blockers (Blocked), but cannot tamper with parent task configurations or complete tasks directly
    if (isMember) {
      if (body.title || body.description !== undefined || body.priority || body.dueDate !== undefined || body.due_date !== undefined) {
        throw new ForbiddenError('Team members cannot modify parent task configurations (title, priority, due date, description)');
      }
      if (body.status && !MEMBER_SETTABLE_STATUSES.includes(body.status)) {
        throw new ForbiddenError('Team members can only submit work for review or report blockers; only Team Leads or Managers can approve or complete tasks');
      }
    }

    const updateData = {};

    // Reassignment (PM, manager, or the current Team Lead); audit logged below.
    const newAssigneeId = body.assignedToId ?? body.assigned_to_id;
    if (newAssigneeId !== undefined && newAssigneeId !== existing.assignedToId) {
      if (!(canApprove || (isTeamLead && isAssignee))) {
        throw new ForbiddenError('Only the Project Manager or the current Team Lead can reassign this task');
      }
      if (!newAssigneeId) {
        throw new BadRequestError('A parent task must stay assigned to a Team Lead');
      }
      const candidate = await assertActiveTeamLead(req.user.companyId, String(newAssigneeId), existing.project?.teamId);
      updateData.assignedToId = candidate.id;
    }

    if (body.title) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) {
      validateEnum(body.status, ALLOWED_TASK_STATUSES, 'status');
      // D-S5: only the PM (or a manager) approves a parent task.
      if (body.status === 'Completed' && body.status !== existing.status && !canApprove) {
        throw new ForbiddenError('Only the Project Manager can mark this task Completed; submit it for review instead');
      }
      updateData.status = body.status;
      if (body.status === 'Completed') {
        updateData.completedAt = new Date();
      } else if (existing.completedAt) {
        updateData.completedAt = null;
      }
    }
    if (body.priority) {
      validateEnum(body.priority, ALLOWED_TASK_PRIORITIES, 'priority');
      updateData.priority = body.priority;
    }
    if (body.dueDate !== undefined || body.due_date !== undefined) {
      const d = body.dueDate !== undefined ? body.dueDate : body.due_date;
      updateData.dueDate = parseOptionalDate(d, 'dueDate');
    }
    const deadlineExtensionReason = typeof body.deadlineExtensionReason === 'string'
      ? body.deadlineExtensionReason.trim()
      : '';
    if (body.deadlineExtensionReason !== undefined) {
      if (!isProjectManagerRole(req.user)) {
        throw new ForbiddenError('Only Project Managers can grant deadline extensions');
      }
      if (
        !deadlineExtensionReason
        || !updateData.dueDate
        || updateData.dueDate <= new Date()
      ) {
        throw new BadRequestError('A reason and a future deadline are required');
      }
      if (existing.dueDate && updateData.dueDate <= existing.dueDate) {
        throw new BadRequestError('The new deadline must be later than the current deadline');
      }
    }
    // A Team Lead must give a reason for any due-date change.
    const dueDateChanged = updateData.dueDate !== undefined
      && (updateData.dueDate?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
    const dueDateReason = typeof body.dueDateReason === 'string' ? body.dueDateReason.trim() : '';
    if (dueDateChanged && !canApprove && !dueDateReason) {
      throw new BadRequestError('A reason (dueDateReason) is required to change the due date');
    }
    if (dueDateChanged && updateData.dueDate) {
      assertNotPast(updateData.dueDate, 'dueDate');
      // The task deadline cannot move before any of its subtask deadlines.
      const laterSubtask = await prisma.subtask.findFirst({
        where: { taskId: id, deletedAt: null, dueDate: { gt: updateData.dueDate } },
        orderBy: { dueDate: 'desc' },
        select: { title: true, dueDate: true },
      });
      if (laterSubtask) {
        throw new BadRequestError(
          `dueDate cannot be before subtask "${laterSubtask.title}" due ${formatDay(laterSubtask.dueDate)}`
        );
      }
    }
    if (body.actualHours !== undefined || body.actual_hours !== undefined) {
      const hours = body.actualHours !== undefined ? body.actualHours : body.actual_hours;
      updateData.actualHours = parseOptionalHours(hours, 'actualHours');
    }

    // 🔴 THE INTERCEPTOR: Evaluate Compliance Before Saving
    // D-S6: pmApproval is only valid for the final In_Review -> Completed approval.
    const isPmApproval = body.pmApproval === true;
    if (isPmApproval) {
      if (!isProjectManagerRole(req.user)) {
        throw new ForbiddenError('Only a Project Manager can give final approval');
      }
      if (existing.status !== 'In_Review' || updateData.status !== 'Completed') {
        throw new BadRequestError('pmApproval is only valid when approving an In_Review task as Completed');
      }
    }
    if (updateData.status && updateData.status !== existing.status && !isPmApproval) {
      const evaluation = await evaluateTaskTransition(id, existing, updateData);

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

          // 2. Cross-Module Escalation: Ensure an active Escalation exists for PM visibility
          const existingEscalation = await prisma.escalation.findFirst({
            where: {
              taskId: id,
              companyId: req.user.companyId,
              status: 'Open',
              blockerType: 'Compliance Blocker'
            }
          });

          if (!existingEscalation) {
            try {
              await prisma.escalation.create({
                data: {
                  companyId: req.user.companyId,
                  taskId: id,
                  projectId: existing.projectId || null,
                  reportedById: req.user.id,
                  title: `Compliance Blocker: ${existing.title} (${rule.name})`,
                  description: `Task status transition to "${updateData.status}" was blocked by compliance rule "${rule.name}". Approved compliance evidence is required.`,
                  blockerType: 'Compliance Blocker',
                  priority: ['Critical', 'High'].includes(rule.severity) ? 'Critical' : 'High',
                  status: 'Open'
                }
              });
            } catch (escErr) {
              console.warn('[Escalation] Notice: Auto-escalation for compliance block:', escErr.message);
            }
          }
        }

        if (existing.createdById !== req.user.id) {
          notify(req.user.companyId, existing.createdById, 'Compliance block',
            `"${existing.title}" could not move to ${updateData.status}: compliance evidence is required.`, 'Compliance');
        }

        // 3. Block the transition and return 403 Forbidden to the Frontend
        return res.status(403).json({
          success: false,
          error: "COMPLIANCE_BLOCK",
          code: "COMPLIANCE_BLOCK",
          message: "This transition is blocked by active compliance rules.",
          violations: evaluation.failedRules
        });
      }
    }

    // 🟢 IF ALLOWED: Proceed with normal Prisma update
    const include = TASK_ITEM_INCLUDE;
    // Optional handover summary sent with a submission for review (Task has no notes column).
    const submissionNote = updateData.status === 'In_Review' && body.submissionNote
      ? String(body.submissionNote).trim().slice(0, 2000)
      : '';
    const auditNewValue = {
      ...updateData,
      ...(submissionNote ? { submissionNote } : {}),
      ...(dueDateReason ? { dueDateReason } : {}),
      ...(isPmApproval ? { pmApprovalComplianceBypass: true } : {}),
    };
    let updated;
    if (deadlineExtensionReason) {
      updated = await prisma.$transaction(async (transaction) => {
        const task = await transaction.task.update({ where: { id }, data: updateData, include });
        const violations = await transaction.complianceViolation.findMany({
          where: {
            companyId: req.user.companyId,
            entityType: 'Task',
            entityId: id,
            status: { in: ['Open', 'Under_Review'] },
          },
          include: { rule: true },
        });
        // TODO(SEC-M3-24): switch to rule.ruleType once SEC-M1-13 adds it.
        for (const violation of violations.filter((item) => item.rule?.name?.toLowerCase().includes('overdue'))) {
          const resolutionRemarks = `Deadline extended to ${task.dueDate.toISOString().slice(0, 10)}. Reason: ${deadlineExtensionReason}`;
          await transaction.complianceViolation.update({
            where: { id: violation.id },
            data: {
              status: 'Resolved',
              resolvedById: req.user.id,
              resolvedAt: new Date(),
              resolutionRemarks,
            },
          });
          await transaction.complianceAuditLog.create({
            data: {
              companyId: req.user.companyId,
              violationId: violation.id,
              action: AUDIT_ACTIONS.STATUS_CHANGE,
              performedById: req.user.id,
              oldValue: { status: violation.status },
              newValue: { status: 'Resolved', resolutionRemarks },
            },
          });
        }
        await transaction.processAuditLog.create({
          data: {
            companyId: req.user.companyId,
            projectId: existing.projectId,
            taskId: id,
            action: AUDIT_ACTIONS.UPDATE,
            performedById: req.user.id,
            oldValue: { dueDate: existing.dueDate?.toISOString() || null },
            newValue: { dueDate: task.dueDate?.toISOString() || null, deadlineExtensionReason },
          },
        });
        return task;
      });
    } else {
      updated = await prisma.task.update({ where: { id }, data: updateData, include });
      try {
        await createProcessAuditLog({
          companyId: req.user.companyId,
          taskId: id,
          action: body.status && body.status !== existing.status ? AUDIT_ACTIONS.STATUS_CHANGE : AUDIT_ACTIONS.UPDATE,
          performedById: req.user.id,
          oldValue: {
            status: existing.status,
            title: existing.title,
            assignedToId: existing.assignedToId,
            dueDate: existing.dueDate?.toISOString() || null,
          },
          newValue: auditNewValue,
        });
      } catch (auditErr) {
        console.warn('[AuditLog] Notice: Audit record logging during task update:', auditErr.message);
      }
    }

    if (updateData.assignedToId) {
      notify(req.user.companyId, updateData.assignedToId, 'Task reassigned to you', `You are now responsible for "${updated.title}".`, 'Task');
    }
    if (updateData.status === 'In_Review' && existing.status !== 'In_Review' && existing.createdById !== req.user.id) {
      notify(req.user.companyId, existing.createdById, 'Task ready for review', `"${updated.title}" was submitted for your review.${submissionNote ? ` Notes: ${submissionNote}` : ''}`, 'Task');
    }
    if (updateData.status === 'Completed' && existing.status !== 'Completed' && existing.assignedToId && existing.assignedToId !== req.user.id) {
      notify(req.user.companyId, existing.assignedToId, 'Task approved', `"${updated.title}" was approved and marked Completed.`, 'Task');
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: withSubtaskProgress(updated),
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
      where: {
        ...await scopedTaskWhere(req),
        id,
        companyId: req.user.companyId,
      },
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
      where: await scopedSubtaskWhere(req, req.query.branchId),
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
    const parentTask = await prisma.task.findFirst({
      where: {
        ...await scopedTaskWhere(req),
        id: taskId,
        companyId: req.user.companyId,
      },
      select: { id: true },
    });

    if (!parentTask) {
      throw new NotFoundError(`Task with ID ${taskId} not found in this company`);
    }

    const subtasks = await prisma.subtask.findMany({
      where: {
        ...await scopedSubtaskWhere(req, req.query.branchId),
        taskId,
        companyId: req.user.companyId,
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
      where: {
        ...await scopedSubtaskWhere(req, req.query.branchId),
        id,
        companyId: req.user.companyId,
      },
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
    const dueDate = parseOptionalDate(body.dueDate || body.due_date, 'dueDate');

    validateRequired({ taskId, title }, ['taskId', 'title']);
    validateEnum(status, ALLOWED_TASK_STATUSES, 'status');

    // Verify parent task belongs to caller company
    const parentTask = await prisma.task.findFirst({
      where: {
        ...await scopedTaskWhere(req),
        id: taskId,
        companyId: req.user.companyId,
      },
      include: { project: { select: { teamId: true } } },
    });

    if (!parentTask) {
      throw new NotFoundError(`Parent task ${taskId} not found in this company`);
    }

    if (CLOSED_TASK_STATUSES.includes(parentTask.status)) {
      throw new BadRequestError(`Subtasks cannot be added to a ${parentTask.status} task`);
    }

    assertNotPast(dueDate, 'dueDate');
    assertWithinParentDeadline(dueDate, parentTask.dueDate);

    const assignedToId = body.assignedToId || body.assigned_to_id || body.assignedTo || null;

    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedToId,
          companyId: req.user.companyId,
          isActive: true,
        },
        select: {
          id: true,
          managerUserId: true,
          teamMembers: parentTask.project?.teamId
            ? { where: { teamId: parentTask.project.teamId }, select: { id: true } }
            : false,
        },
      });

      if (!assignee) {
        throw new BadRequestError(
          'Assigned user does not belong to this company or is inactive'
        );
      }

      // Team Leads may assign to themselves, direct reports or members of the project team.
      const inProjectTeam = Array.isArray(assignee.teamMembers) && assignee.teamMembers.length > 0;
      if (
        isTeamLeadRole(req.user) &&
        assignee.id !== req.user.id &&
        assignee.managerUserId !== req.user.id &&
        !inProjectTeam
      ) {
        throw new ForbiddenError('Team Leads can assign subtasks only to themselves or their team members');
      }
    }

    const subtask = await prisma.subtask.create({
      data: {
        companyId: req.user.companyId,
        taskId,
        title,
        description,
        status,
        assignedToId,
        createdById: req.user.id,
        dueDate,
        completedAt: status === 'Completed' ? new Date() : null,
      },
    });

    if (assignedToId && assignedToId !== req.user.id) {
      notify(req.user.companyId, assignedToId, 'New subtask assigned', `You have been assigned "${subtask.title}".`, 'Task');
    }

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
      where: {
        ...await scopedSubtaskWhere(req, req.query.branchId),
        id,
        companyId: req.user.companyId,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Subtask with ID ${id} not found`);
    }

    // D-S5: members move their own subtask to In_Review; the Team Lead or PM completes it.
    if (isMemberRole(req.user)) {
      if (body.title || body.description !== undefined || body.dueDate !== undefined || body.due_date !== undefined) {
        throw new ForbiddenError('Team members cannot edit subtask details');
      }
      if (body.status && !MEMBER_SETTABLE_STATUSES.includes(body.status)) {
        throw new ForbiddenError('Submit the subtask for review; your Team Lead completes it');
      }
    }

    const updateData = {};
    if (body.title) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dueDate !== undefined || body.due_date !== undefined) {
      const due = parseOptionalDate(body.dueDate !== undefined ? body.dueDate : body.due_date, 'dueDate');
      if ((due?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null)) {
        assertNotPast(due, 'dueDate');
        const parent = await prisma.task.findUnique({ where: { id: existing.taskId }, select: { dueDate: true } });
        assertWithinParentDeadline(due, parent?.dueDate);
      }
      updateData.dueDate = due;
    }
    if (body.status) {
      validateEnum(body.status, ALLOWED_TASK_STATUSES, 'status');
      updateData.status = body.status;
      if (body.status === 'Completed') {
        updateData.completedAt = new Date();
        updateData.reviewComment = null;
      } else {
        updateData.completedAt = null;
      }
    }

    // A reviewer sending someone else's submitted subtask back must say why; the
    // assignee sees this reason in their portal until the subtask is approved.
    const isSendBack = existing.status === 'In_Review' && updateData.status === 'Active'
      && existing.assignedToId && existing.assignedToId !== req.user.id;
    if (isSendBack) {
      const reason = String(body.reviewComment ?? '').trim();
      if (!reason) {
        throw new BadRequestError('Give a reason when sending a subtask back');
      }
      if (reason.length > 1000) {
        throw new BadRequestError('Reason must be 1000 characters or fewer');
      }
      updateData.reviewComment = reason;
    }

    const updated = await prisma.subtask.update({
      where: { id },
      data: updateData,
    });

    if (existing.assignedToId && existing.assignedToId !== req.user.id && updateData.status && updateData.status !== existing.status) {
      if (updateData.status === 'Completed') {
        notify(req.user.companyId, existing.assignedToId, 'Subtask approved', `Your subtask "${updated.title}" was approved.`, 'success');
      } else if (existing.status === 'In_Review' && updateData.status === 'Active') {
        notify(req.user.companyId, existing.assignedToId, 'Subtask sent back', `Your subtask "${updated.title}" was sent back for revision. Reason: ${updated.reviewComment}`, 'warning');
      }
    }

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
      where: {
        ...await scopedSubtaskWhere(req, req.query.branchId),
        id,
        companyId: req.user.companyId,
      },
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
// Escalation visibility (D-S11): owners/admins see all; Branch Managers their branch;
// PMs their projects; Team Leads their tasks; everyone sees what they raised or were sent.
async function buildEscalationWhere(req) {
  const companyId = req.user.companyId;
  if (isCompanyAdmin(req.user)) return { companyId };
  if (isBranchManager(req.user)) {
    const branchId = getBranchScopeId(req.user) || '__no_branch_scope__';
    return {
      companyId,
      OR: [
        { project: { team: { branchId } } },
        { task: { project: { team: { branchId } } } },
      ],
    };
  }
  const own = [{ reportedById: req.user.id }, { targetManagerId: req.user.id }];
  if (isProjectManagerRole(req.user)) {
    const projectIds = await getAssignedProjectIds(prisma, req.user);
    const pmProjects = { OR: [{ createdById: req.user.id }, { id: { in: projectIds } }] };
    return {
      companyId,
      OR: [
        ...own,
        { project: pmProjects },
        { task: { OR: [{ createdById: req.user.id }, { project: pmProjects }] } },
      ],
    };
  }
  if (isTeamLeadRole(req.user)) {
    return { companyId, OR: [...own, { task: { assignedToId: req.user.id } }] };
  }
  return { companyId, OR: own };
}

export async function listEscalations(req, res, next) {
  try {
    const escalations = await prisma.escalation.findMany({
      where: await buildEscalationWhere(req),
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
      where: { ...await buildEscalationWhere(req), id },
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
    const rawPriority = String(body.priority || 'High').trim().toLowerCase();
    const priority = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1);
    const targetManagerId = body.targetManagerId || body.target_manager_id || null;

    validateRequired({ title }, ['title']);
    validateEnum(priority, ALLOWED_ESCALATION_PRIORITIES, 'priority');

    let task = null;
    if (taskId) {
      task = await prisma.task.findFirst({
        where: { id: taskId, companyId: req.user.companyId, deletedAt: null },
      });
      if (!task) throw new NotFoundError(`Task ${taskId} not found in this company`);
      if (projectId && task.projectId && task.projectId !== projectId) {
        throw new BadRequestError('taskId does not belong to the given projectId');
      }
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null, team: { branch: { companyId: req.user.companyId } } },
      });
      if (!project) throw new NotFoundError(`Project ${projectId} not found in this company`);
    }

    // Validate targetManagerId belongs to the same company
    if (targetManagerId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: targetManagerId, companyId: req.user.companyId },
        select: { id: true },
      });
      if (!targetUser) throw new NotFoundError(`Target manager ${targetManagerId} not found in this company`);
    }

    const escalation = await prisma.escalation.create({
      data: {
        companyId: req.user.companyId,
        taskId,
        projectId: projectId || task?.projectId || null,
        title,
        description,
        blockerType,
        priority,
        reportedById: req.user.id,
        targetManagerId: targetManagerId || null,
        status: 'Open',
      },
    });

    const escalationRecipient = targetManagerId || task?.createdById;
    if (escalationRecipient && escalationRecipient !== req.user.id) {
      notify(req.user.companyId, escalationRecipient, 'New escalation', `"${escalation.title}" needs your attention.`, 'Escalation');
    }

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
      where: { ...await buildEscalationWhere(req), id },
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
      } else {
        updateData.resolvedAt = null;
      }
    }
    if (body.description) updateData.description = body.description;

    const updated = await prisma.escalation.update({
      where: { id },
      data: updateData,
    });

    if (updateData.status && updateData.status !== existing.status && existing.reportedById !== req.user.id) {
      notify(req.user.companyId, existing.reportedById, `Escalation ${updateData.status.toLowerCase()}`,
        `"${existing.title}" is now ${updateData.status}.`, 'Escalation');
    }

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
      where: { ...await buildEscalationWhere(req), id },
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
