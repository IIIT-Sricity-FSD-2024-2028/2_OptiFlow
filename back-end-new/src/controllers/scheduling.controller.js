import { prisma } from '../config/prisma.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import {
  buildTaskListWhere,
  getAssignedProjectIds,
  assertBranchManagerScope,
  isBranchManager,
} from '../utils/tenantScope.js';
import {
  getCompanySchedulingPolicy,
  evaluateTaskCapacity,
  getMemberCapacityMap,
  buildAutoSchedulePlan,
  toUtcDay,
  isoDay,
  todayUtcDay,
} from '../services/scheduling.service.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

/**
 * GET /api/scheduling/policy
 * Returns the authenticated tenant's scheduling policy & holidays.
 */
export async function getSchedulingPolicy(req, res, next) {
  try {
    const policy = await getCompanySchedulingPolicy(prisma, req.user.companyId);
    res.status(200).json({
      success: true,
      data: {
        workHoursPerDay: policy.workHoursPerDay,
        workingDays: policy.workingDays,
        defaultReviewBufferDays: policy.defaultReviewBufferDays,
        enforceCapacityBlock: policy.enforceCapacityBlock,
        holidays: policy.holidays,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/scheduling/policy
 * Updates the company's scheduling policy (Owner / System Admin).
 */
export async function updateSchedulingPolicy(req, res, next) {
  try {
    const body = req.body || {};
    const companyId = req.user.companyId;
    const current = await getCompanySchedulingPolicy(prisma, companyId);

    let workHoursPerDay = current.workHoursPerDay;
    if (body.workHoursPerDay !== undefined) {
      const parsed = Number(body.workHoursPerDay);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 24) {
        throw new BadRequestError('workHoursPerDay must be between 1 and 24');
      }
      workHoursPerDay = parsed;
    }

    let workingDays = current.workingDays;
    if (body.workingDays !== undefined) {
      if (!Array.isArray(body.workingDays) || body.workingDays.length === 0) {
        throw new BadRequestError('workingDays must be a non-empty array of ISO weekdays (1=Mon .. 7=Sun)');
      }
      const unique = Array.from(new Set(body.workingDays.map(Number))).filter(
        (d) => Number.isInteger(d) && d >= 1 && d <= 7
      );
      if (unique.length === 0) {
        throw new BadRequestError('workingDays must contain valid ISO weekdays (1..7)');
      }
      workingDays = unique.sort((a, b) => a - b);
    }

    let defaultReviewBufferDays = current.defaultReviewBufferDays;
    if (body.defaultReviewBufferDays !== undefined) {
      const parsed = Number(body.defaultReviewBufferDays);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30) {
        throw new BadRequestError('defaultReviewBufferDays must be an integer between 0 and 30');
      }
      defaultReviewBufferDays = parsed;
    }

    const enforceCapacityBlock = body.enforceCapacityBlock !== undefined
      ? Boolean(body.enforceCapacityBlock)
      : current.enforceCapacityBlock;

    await prisma.companySchedulingPolicy.upsert({
      where: { companyId },
      create: {
        companyId,
        workHoursPerDay,
        workingDays,
        defaultReviewBufferDays,
        enforceCapacityBlock,
      },
      update: {
        workHoursPerDay,
        workingDays,
        defaultReviewBufferDays,
        enforceCapacityBlock,
      },
    });

    try {
      await createSystemAuditLog({
        companyId,
        entityType: 'CompanySchedulingPolicy',
        entityId: companyId,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        newValue: { workHoursPerDay, workingDays, defaultReviewBufferDays, enforceCapacityBlock },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Policy update notice:', auditErr.message);
    }

    const updated = await getCompanySchedulingPolicy(prisma, companyId);
    res.status(200).json({
      success: true,
      message: 'Scheduling policy updated',
      data: {
        workHoursPerDay: updated.workHoursPerDay,
        workingDays: updated.workingDays,
        defaultReviewBufferDays: updated.defaultReviewBufferDays,
        enforceCapacityBlock: updated.enforceCapacityBlock,
        holidays: updated.holidays,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scheduling/holidays
 */
export async function addCompanyHoliday(req, res, next) {
  try {
    const { date, name } = req.body || {};
    const parsedDate = toUtcDay(date);
    if (!parsedDate) {
      throw new BadRequestError('A valid holiday date (YYYY-MM-DD) is required');
    }
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      throw new BadRequestError('Holiday name is required');
    }

    const created = await prisma.companyHoliday.upsert({
      where: {
        companyId_date: {
          companyId: req.user.companyId,
          date: parsedDate,
        },
      },
      create: {
        companyId: req.user.companyId,
        date: parsedDate,
        name: cleanName,
      },
      update: {
        name: cleanName,
      },
    });

    res.status(201).json({
      success: true,
      data: { id: created.id, date: isoDay(created.date), name: created.name },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/scheduling/holidays/:id
 */
export async function deleteCompanyHoliday(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.companyHoliday.findFirst({
      where: { id, companyId: req.user.companyId },
    });
    if (!existing) {
      throw new NotFoundError('Holiday not found');
    }
    await prisma.companyHoliday.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Holiday removed' });
  } catch (err) {
    next(err);
  }
}

async function loadScopedTaskForScheduling(req, taskId) {
  const scopeWhere = await buildTaskListWhere({
    companyId: req.user.companyId,
    user: req.user,
    assignedProjectIds: await getAssignedProjectIds(prisma, req.user),
  });
  const task = await prisma.task.findFirst({
    where: {
      ...scopeWhere,
      id: taskId,
      companyId: req.user.companyId,
      deletedAt: null,
    },
    include: {
      project: {
        include: {
          team: {
            include: {
              teamMembers: { select: { userId: true } },
            },
          },
        },
      },
      subtasks: {
        where: { deletedAt: null },
        include: {
          dependencies: { select: { dependsOnSubtaskId: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task) {
    throw new NotFoundError(`Task with ID ${taskId} not found in this company`);
  }
  if (isBranchManager(req.user)) {
    const branchId = task.project?.team?.branchId;
    if (branchId) assertBranchManagerScope(req.user, branchId, 'view this task');
  }
  return task;
}

/**
 * GET /api/tasks/:id/schedule-analysis
 * Returns deadline vs hours capacity, critical path, review buffer, and cross-task member workloads.
 */
export async function getTaskScheduleAnalysis(req, res, next) {
  try {
    const { id } = req.params;
    const [task, policy] = await Promise.all([
      loadScopedTaskForScheduling(req, id),
      getCompanySchedulingPolicy(prisma, req.user.companyId),
    ]);

    const teamMemberIds = (task.project?.team?.teamMembers || []).map((m) => m.userId);
    const subtaskAssigneeIds = task.subtasks.map((st) => st.assignedToId).filter(Boolean);
    const allCandidateIds = Array.from(new Set([...teamMemberIds, ...subtaskAssigneeIds, task.assignedToId].filter(Boolean)));

    const analysis = evaluateTaskCapacity({
      task,
      subtasks: task.subtasks,
      policy,
      teamMemberCount: teamMemberIds.length,
    });

    const memberCapacities = await getMemberCapacityMap(
      prisma,
      req.user.companyId,
      allCandidateIds,
      todayUtcDay(),
      task.dueDate,
      policy
    );

    res.status(200).json({
      success: true,
      data: {
        taskId: task.id,
        dueDate: isoDay(task.dueDate),
        estimatedHours: task.estimatedHours != null ? Number(task.estimatedHours) : null,
        policy: {
          workHoursPerDay: policy.workHoursPerDay,
          workingDays: policy.workingDays,
          defaultReviewBufferDays: policy.defaultReviewBufferDays,
          enforceCapacityBlock: policy.enforceCapacityBlock,
          holidays: policy.holidays,
        },
        ...analysis,
        memberCapacities,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tasks/:id/auto-schedule
 * Computes (and optionally applies) staggered startDate / dueDate values across active subtasks.
 */
export async function autoScheduleTask(req, res, next) {
  try {
    const { id } = req.params;
    const apply = req.body?.apply !== false;
    const [task, policy] = await Promise.all([
      loadScopedTaskForScheduling(req, id),
      getCompanySchedulingPolicy(prisma, req.user.companyId),
    ]);

    const plan = buildAutoSchedulePlan({
      task,
      subtasks: task.subtasks,
      policy,
    });

    if (apply && plan.length > 0) {
      await prisma.$transaction(
        plan.map((item) =>
          prisma.subtask.update({
            where: { id: item.subtaskId },
            data: {
              startDate: item.startDate,
              dueDate: item.dueDate,
            },
          })
        )
      );
    }

    res.status(200).json({
      success: true,
      message: apply ? `Auto-scheduled ${plan.length} subtask(s)` : 'Auto-schedule preview ready',
      data: {
        applied: apply,
        plan,
      },
    });
  } catch (err) {
    next(err);
  }
}
