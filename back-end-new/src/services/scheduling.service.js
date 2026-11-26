import { BadRequestError } from '../utils/errors.js';

export const DEFAULT_SCHEDULING_POLICY = Object.freeze({
  workHoursPerDay: 8,
  workingDays: [1, 2, 3, 4, 5],
  defaultReviewBufferDays: 1,
  enforceCapacityBlock: false,
  holidays: [],
});

const MS_PER_DAY = 86400000;

export function toUtcDay(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isoDay(value) {
  const d = toUtcDay(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

export function todayUtcDay() {
  return toUtcDay(new Date());
}

/** ISO weekday: 1 (Mon) .. 7 (Sun). */
export function isoWeekday(date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Loads the company's scheduling policy and holiday calendar, falling back to
 * sensible defaults when no custom policy has been saved yet.
 */
export async function getCompanySchedulingPolicy(prisma, companyId) {
  if (!companyId) {
    return {
      ...DEFAULT_SCHEDULING_POLICY,
      holidaySet: new Set(),
    };
  }
  const [policyRow, holidays] = await Promise.all([
    prisma.companySchedulingPolicy.findUnique({ where: { companyId } }),
    prisma.companyHoliday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    }),
  ]);

  const workingDays = Array.isArray(policyRow?.workingDays) && policyRow.workingDays.length > 0
    ? policyRow.workingDays
    : DEFAULT_SCHEDULING_POLICY.workingDays;

  const formattedHolidays = (holidays || []).map((h) => ({
    id: h.id,
    date: isoDay(h.date),
    name: h.name,
  }));

  return {
    id: policyRow?.id || null,
    companyId,
    workHoursPerDay: policyRow?.workHoursPerDay != null
      ? Number(policyRow.workHoursPerDay)
      : DEFAULT_SCHEDULING_POLICY.workHoursPerDay,
    workingDays,
    defaultReviewBufferDays: policyRow?.defaultReviewBufferDays ?? DEFAULT_SCHEDULING_POLICY.defaultReviewBufferDays,
    enforceCapacityBlock: Boolean(policyRow?.enforceCapacityBlock ?? DEFAULT_SCHEDULING_POLICY.enforceCapacityBlock),
    holidays: formattedHolidays,
    holidaySet: new Set(formattedHolidays.map((h) => h.date)),
  };
}

export function isWorkingDay(date, policy = DEFAULT_SCHEDULING_POLICY) {
  const d = toUtcDay(date);
  if (!d) return false;
  const workingDays = policy.workingDays?.length ? policy.workingDays : DEFAULT_SCHEDULING_POLICY.workingDays;
  if (!workingDays.includes(isoWeekday(d))) return false;
  if (policy.holidaySet && policy.holidaySet.has(isoDay(d))) return false;
  return true;
}

export function countWorkingDays(startDate, endDate, policy = DEFAULT_SCHEDULING_POLICY) {
  const start = toUtcDay(startDate);
  const end = toUtcDay(endDate);
  if (!start || !end || end < start) return 0;

  let count = 0;
  for (let ms = start.getTime(); ms <= end.getTime(); ms += MS_PER_DAY) {
    if (isWorkingDay(new Date(ms), policy)) count += 1;
  }
  return count;
}

export function availableWorkingHours(startDate, endDate, policy = DEFAULT_SCHEDULING_POLICY) {
  const hoursPerDay = Number(policy?.workHoursPerDay || DEFAULT_SCHEDULING_POLICY.workHoursPerDay);
  return Number((countWorkingDays(startDate, endDate, policy) * hoursPerDay).toFixed(2));
}

export function subtractWorkingDays(targetDate, bufferDays, policy = DEFAULT_SCHEDULING_POLICY) {
  const target = toUtcDay(targetDate);
  if (!target) return null;
  const steps = Math.max(0, Number(bufferDays || 0));
  if (steps === 0) return target;

  let remaining = steps;
  let cursor = new Date(target.getTime());
  let guard = 0;
  while (remaining > 0 && guard < 365) {
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
    if (isWorkingDay(cursor, policy)) remaining -= 1;
    guard += 1;
  }
  return cursor;
}

export function addWorkingDays(startDate, workingDaysToAdd, policy = DEFAULT_SCHEDULING_POLICY) {
  const start = toUtcDay(startDate);
  if (!start) return null;
  let cursor = new Date(start.getTime());
  let guard = 0;
  // Advance onto a working day if start itself falls on weekend/holiday
  while (!isWorkingDay(cursor, policy) && guard < 365) {
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
    guard += 1;
  }
  let remaining = Math.max(0, Number(workingDaysToAdd || 0));
  while (remaining > 0 && guard < 730) {
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
    if (isWorkingDay(cursor, policy)) remaining -= 1;
    guard += 1;
  }
  return cursor;
}

export function extractDependencyIds(subtask) {
  if (Array.isArray(subtask?.dependsOnIds)) return subtask.dependsOnIds.map(String);
  if (Array.isArray(subtask?.dependencies)) {
    return subtask.dependencies.map((d) => String(d.dependsOnSubtaskId || d.id));
  }
  return [];
}

/**
 * Detects whether assigning `nextDependsOnIds` to `targetId` introduces a cycle.
 */
export function detectCycleInSubtaskGraph(subtasks, targetId, nextDependsOnIds = []) {
  const target = String(targetId);
  const nextSet = new Set(nextDependsOnIds.map(String));
  if (nextSet.has(target)) return true;

  const adj = new Map();
  for (const st of subtasks || []) {
    const id = String(st.id);
    adj.set(id, id === target ? Array.from(nextSet) : extractDependencyIds(st));
  }
  if (!adj.has(target)) {
    adj.set(target, Array.from(nextSet));
  }

  // BFS from target's proposed prerequisites; if we can reach target via prerequisites, there is a cycle.
  const queue = Array.from(nextSet);
  const visited = new Set();
  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === target) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const deps = adj.get(curr) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }
  return false;
}

/**
 * Computes critical path length in estimatedHours across a task's subtask DAG.
 * Returns { criticalPathHours, criticalPathSubtaskIds, hasCycle, topoOrder }.
 */
export function computeCriticalPath(subtasks = []) {
  const active = (subtasks || []).filter((st) => st && !st.deletedAt && st.status !== 'Cancelled');
  const nodeMap = new Map(active.map((st) => [String(st.id), st]));
  const inDegree = new Map();
  const dependentsMap = new Map();

  for (const st of active) {
    const id = String(st.id);
    inDegree.set(id, 0);
    dependentsMap.set(id, []);
  }

  for (const st of active) {
    const id = String(st.id);
    const deps = extractDependencyIds(st).filter((depId) => nodeMap.has(depId) && depId !== id);
    const uniqueDeps = Array.from(new Set(deps));
    inDegree.set(id, uniqueDeps.length);
    for (const depId of uniqueDeps) {
      dependentsMap.get(depId).push(id);
    }
  }

  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const bestTotal = new Map();
  const prevNode = new Map();
  for (const st of active) {
    const id = String(st.id);
    const hrs = st.estimatedHours != null ? Number(st.estimatedHours) : 0;
    bestTotal.set(id, hrs);
    prevNode.set(id, null);
  }

  const topoOrder = [];
  while (queue.length > 0) {
    const curr = queue.shift();
    topoOrder.push(curr);
    const currHours = bestTotal.get(curr) || 0;
    for (const nextId of dependentsMap.get(curr) || []) {
      const nextOwn = nodeMap.get(nextId)?.estimatedHours != null ? Number(nodeMap.get(nextId).estimatedHours) : 0;
      const candidate = currHours + nextOwn;
      if (candidate > (bestTotal.get(nextId) || 0)) {
        bestTotal.set(nextId, candidate);
        prevNode.set(nextId, curr);
      }
      const nextDeg = (inDegree.get(nextId) || 0) - 1;
      inDegree.set(nextId, nextDeg);
      if (nextDeg === 0) queue.push(nextId);
    }
  }

  if (topoOrder.length !== active.length) {
    return { criticalPathHours: 0, criticalPathSubtaskIds: [], hasCycle: true, topoOrder: [] };
  }

  let endId = null;
  let maxHours = 0;
  for (const id of topoOrder) {
    const total = bestTotal.get(id) || 0;
    if (total >= maxHours) {
      maxHours = total;
      endId = id;
    }
  }

  const path = [];
  let cursor = endId;
  while (cursor) {
    path.unshift(cursor);
    cursor = prevNode.get(cursor) || null;
  }

  return {
    criticalPathHours: Number(maxHours.toFixed(2)),
    criticalPathSubtaskIds: maxHours > 0 ? path : [],
    hasCycle: false,
    topoOrder,
  };
}

/**
 * Loads cross-task open workload for a list of users within [windowStart, windowEnd].
 */
export async function getMemberCapacityMap(prisma, companyId, memberIds = [], windowStart, windowEnd, policy) {
  const uniqueIds = Array.from(new Set((memberIds || []).filter(Boolean).map(String)));
  const result = {};
  const start = toUtcDay(windowStart) || todayUtcDay();
  const end = toUtcDay(windowEnd);
  const windowCapacityHours = end ? availableWorkingHours(start, end, policy) : null;

  for (const id of uniqueIds) {
    result[id] = {
      userId: id,
      activeSubtasksCount: 0,
      totalActiveHours: 0,
      windowHours: 0,
      windowCapacityHours,
      utilizationPct: 0,
    };
  }
  if (uniqueIds.length === 0) return result;

  const openSubtasks = await prisma.subtask.findMany({
    where: {
      companyId,
      deletedAt: null,
      assignedToId: { in: uniqueIds },
      status: { notIn: ['Completed', 'Cancelled'] },
    },
    select: {
      id: true,
      assignedToId: true,
      estimatedHours: true,
      startDate: true,
      dueDate: true,
      createdAt: true,
    },
  });

  for (const st of openSubtasks) {
    const uid = String(st.assignedToId);
    const entry = result[uid];
    if (!entry) continue;
    const hrs = st.estimatedHours != null ? Number(st.estimatedHours) : 0;
    entry.activeSubtasksCount += 1;
    entry.totalActiveHours = Number((entry.totalActiveHours + hrs).toFixed(2));

    // Determine whether this subtask overlaps [start, end]
    if (end) {
      const stStart = toUtcDay(st.startDate || st.createdAt) || start;
      const stEnd = toUtcDay(st.dueDate) || end;
      if (stStart <= end && stEnd >= start) {
        entry.windowHours = Number((entry.windowHours + hrs).toFixed(2));
      }
    } else {
      entry.windowHours = entry.totalActiveHours;
    }
  }

  for (const uid of uniqueIds) {
    const entry = result[uid];
    if (entry.windowCapacityHours > 0) {
      entry.utilizationPct = Math.round((entry.windowHours / entry.windowCapacityHours) * 100);
    } else if (entry.windowHours > 0) {
      entry.utilizationPct = 100;
    }
  }

  return result;
}

/**
 * Evaluates a parent task's deadline vs hours feasibility, critical path, review buffer,
 * and last-moment subtask clustering.
 */
export function evaluateTaskCapacity({
  task,
  subtasks = [],
  policy = DEFAULT_SCHEDULING_POLICY,
  teamMemberCount = 0,
  startAnchor = null,
}) {
  const today = toUtcDay(startAnchor) || todayUtcDay();
  const taskDue = toUtcDay(task?.dueDate);
  const taskStart = toUtcDay(task?.project?.startDate) && toUtcDay(task.project.startDate) > today
    ? toUtcDay(task.project.startDate)
    : today;

  const reviewBufferDays = task?.reviewBufferDays != null
    ? Number(task.reviewBufferDays)
    : Number(policy.defaultReviewBufferDays ?? DEFAULT_SCHEDULING_POLICY.defaultReviewBufferDays);

  const workingDaysRemaining = taskDue ? countWorkingDays(taskStart, taskDue, policy) : null;
  const availableWindowHours = taskDue ? availableWorkingHours(taskStart, taskDue, policy) : null;
  const latestRecommendedSubtaskDue = taskDue
    ? subtractWorkingDays(taskDue, reviewBufferDays, policy)
    : null;
  const effectiveSubtaskWindowHours = latestRecommendedSubtaskDue
    ? availableWorkingHours(taskStart, latestRecommendedSubtaskDue, policy)
    : availableWindowHours;

  const activeSubtasks = (subtasks || []).filter((st) => st && !st.deletedAt && st.status !== 'Cancelled');
  const allocatedHours = Number(
    activeSubtasks.reduce((sum, st) => sum + (st?.estimatedHours != null ? Number(st.estimatedHours) : 0), 0).toFixed(2)
  );
  const { criticalPathHours, criticalPathSubtaskIds, hasCycle } = computeCriticalPath(activeSubtasks);
  const taskEstimated = task?.estimatedHours != null ? Number(task.estimatedHours) : null;
  const warnings = [];

  if (hasCycle) {
    warnings.push({
      severity: 'error',
      code: 'DEPENDENCY_CYCLE',
      message: 'A cyclic dependency was detected among subtasks.',
    });
  }

  const effectiveTeamSize = teamMemberCount > 0 ? teamMemberCount : 1;
  const maxTeamHours = availableWindowHours != null
    ? Number((availableWindowHours * effectiveTeamSize).toFixed(2))
    : null;

  if (taskDue) {
    if (workingDaysRemaining === 0 && ((taskEstimated && taskEstimated > 0) || allocatedHours > 0)) {
      warnings.push({
        severity: 'error',
        code: 'NO_WORKING_DAYS',
        message: 'No working days remain before the task due date based on the company calendar.',
      });
    } else {
      if (taskEstimated != null && taskEstimated > 0 && availableWindowHours != null && taskEstimated > availableWindowHours) {
        const minParallelPeople = Math.ceil(taskEstimated / Math.max(availableWindowHours, 1));
        if (maxTeamHours != null && taskEstimated > maxTeamHours) {
          warnings.push({
            severity: 'error',
            code: 'EXCEEDS_TEAM_CAPACITY',
            message: `Not possible with your available team: ${taskEstimated}h exceeds the maximum ${maxTeamHours}h your team of ${effectiveTeamSize} can handle (${availableWindowHours}h per person over ${workingDaysRemaining} working day(s) before ${isoDay(taskDue)}). Would need at least ${minParallelPeople} people working full-time.`,
          });
        } else {
          warnings.push({
            severity: 'warning',
            code: 'REQUIRES_PARALLEL_EXECUTION',
            message: `${taskEstimated}h exceeds one person's ${availableWindowHours}h capacity (${workingDaysRemaining} working day(s)). Needs at least ${minParallelPeople} team members working in parallel.`,
          });
        }
      }

      if (criticalPathHours > 0 && availableWindowHours != null && criticalPathHours > availableWindowHours) {
        warnings.push({
          severity: 'error',
          code: 'CRITICAL_PATH_EXCEEDS_DEADLINE',
          message: `Step-by-step dependent subtasks total ${criticalPathHours}h, exceeding the ${availableWindowHours}h available before ${isoDay(taskDue)}. Adding more people won't speed up chained steps.`,
        });
      } else if (
        criticalPathHours > 0 &&
        effectiveSubtaskWindowHours != null &&
        criticalPathHours > effectiveSubtaskWindowHours &&
        reviewBufferDays > 0
      ) {
        warnings.push({
          severity: 'warning',
          code: 'CRITICAL_PATH_EATS_REVIEW_BUFFER',
          message: `Step-by-step chain (${criticalPathHours}h) leaves fewer than ${reviewBufferDays} work day(s) for final review before ${isoDay(taskDue)}.`,
        });
      }
    }

    // Check subtasks finishing inside review window
    if (reviewBufferDays > 0 && latestRecommendedSubtaskDue) {
      const lateSubtasks = activeSubtasks.filter((st) => {
        if (st.status === 'Completed') return false;
        const stDue = toUtcDay(st.dueDate);
        return stDue && stDue > latestRecommendedSubtaskDue;
      });
      if (lateSubtasks.length > 0) {
        warnings.push({
          severity: 'warning',
          code: 'REVIEW_BUFFER_AT_RISK',
          message: `${lateSubtasks.length} subtask(s) finish after ${isoDay(latestRecommendedSubtaskDue)}, leaving fewer than ${reviewBufferDays} work day(s) for review before ${isoDay(taskDue)}.`,
        });
      }
    }

    // Check last-moment clustering (>= 3 open subtasks with due dates & >= 75% in the final working day window)
    const openTimed = activeSubtasks.filter((st) => st.status !== 'Completed' && toUtcDay(st.dueDate));
    if (openTimed.length >= 3) {
      const cutoff = subtractWorkingDays(taskDue, 1, policy);
      const lastMomentCount = openTimed.filter((st) => toUtcDay(st.dueDate) >= cutoff).length;
      if (lastMomentCount / openTimed.length >= 0.75) {
        warnings.push({
          severity: 'warning',
          code: 'LAST_MOMENT_CLUSTERING',
          message: `${lastMomentCount} of ${openTimed.length} open subtasks fall on the final working day/deadline. Consider staggering dates earlier.`,
        });
      }
    }
  }

  return {
    workHoursPerDay: policy.workHoursPerDay,
    workingDays: policy.workingDays,
    enforceCapacityBlock: Boolean(policy.enforceCapacityBlock),
    reviewBufferDays,
    workingDaysRemaining,
    availableWindowHours,
    effectiveSubtaskWindowHours,
    latestRecommendedSubtaskDue: isoDay(latestRecommendedSubtaskDue),
    allocatedHours,
    criticalPathHours,
    criticalPathSubtaskIds,
    warnings,
  };
}

/**
 * Validates subtask date ordering, dependency DAG integrity, dependency date ordering,
 * and computes scheduling/capacity warnings (blocking when policy.enforceCapacityBlock is enabled).
 */
export async function validateAndAnalyzeSubtaskProposal({
  prisma,
  companyId,
  parentTask,
  existingSubtasks = [],
  subtaskId = null,
  startDate = null,
  dueDate = null,
  estimatedHours = null,
  assignedToId = null,
  dependsOnIds = null,
  allowCapacityOverride = false,
  policy,
}) {
  const startDay = toUtcDay(startDate);
  const dueDay = toUtcDay(dueDate);
  const parentDueDay = toUtcDay(parentTask?.dueDate);

  if (startDay && dueDay && startDay > dueDay) {
    throw new BadRequestError(`Subtask startDate (${isoDay(startDay)}) cannot be after dueDate (${isoDay(dueDay)})`);
  }
  if (startDay && parentDueDay && startDay > parentDueDay) {
    throw new BadRequestError(`Subtask startDate (${isoDay(startDay)}) cannot be after task dueDate (${isoDay(parentDueDay)})`);
  }

  // Validate dependency IDs if explicitly provided
  const normalizedDepIds = Array.isArray(dependsOnIds)
    ? Array.from(new Set(dependsOnIds.filter(Boolean).map(String)))
    : null;

  const currentSubtasksMap = new Map(existingSubtasks.map((st) => [String(st.id), st]));

  if (normalizedDepIds !== null) {
    for (const depId of normalizedDepIds) {
      if (subtaskId && depId === String(subtaskId)) {
        throw new BadRequestError('A subtask cannot depend on itself');
      }
      const depRow = currentSubtasksMap.get(depId);
      if (!depRow || depRow.deletedAt) {
        throw new BadRequestError(`Prerequisite subtask ${depId} does not belong to this task`);
      }
    }
    const checkId = subtaskId ? String(subtaskId) : '__proposed__';
    if (detectCycleInSubtaskGraph(existingSubtasks, checkId, normalizedDepIds)) {
      throw new BadRequestError('Dependency creates a circular chain between subtasks');
    }
  }

  const effectiveDepIds = normalizedDepIds !== null
    ? normalizedDepIds
    : (subtaskId ? extractDependencyIds(currentSubtasksMap.get(String(subtaskId))) : []);

  // Dependency Finish-to-Start date rules
  for (const depId of effectiveDepIds) {
    const dep = currentSubtasksMap.get(depId);
    if (!dep) continue;
    const depDue = toUtcDay(dep.dueDate);
    if (depDue && startDay && startDay < depDue) {
      throw new BadRequestError(
        `Subtask startDate (${isoDay(startDay)}) cannot be before prerequisite "${dep.title}" due date (${isoDay(depDue)})`
      );
    }
    if (depDue && dueDay && dueDay < depDue) {
      throw new BadRequestError(
        `Subtask dueDate (${isoDay(dueDay)}) cannot be before prerequisite "${dep.title}" due date (${isoDay(depDue)})`
      );
    }
  }

  // If updating an existing subtask's dueDate, ensure no dependent finishes earlier
  if (subtaskId && dueDay) {
    for (const st of existingSubtasks) {
      const deps = extractDependencyIds(st);
      if (!deps.includes(String(subtaskId))) continue;
      const depStart = toUtcDay(st.startDate);
      const depDue = toUtcDay(st.dueDate);
      if (depDue && dueDay > depDue) {
        throw new BadRequestError(
          `Subtask dueDate (${isoDay(dueDay)}) cannot move past dependent subtask "${st.title}" (${isoDay(depDue)})`
        );
      }
      if (depStart && dueDay > depStart) {
        throw new BadRequestError(
          `Subtask dueDate (${isoDay(dueDay)}) cannot move past dependent subtask "${st.title}" start date (${isoDay(depStart)})`
        );
      }
    }
  }

  // Compose hypothetical subtask list for critical path + capacity check
  const checkId = subtaskId ? String(subtaskId) : '__proposed__';
  const existingTarget = subtaskId ? currentSubtasksMap.get(String(subtaskId)) : null;
  const mergedProposal = {
    id: checkId,
    title: existingTarget?.title || 'New subtask',
    status: existingTarget?.status || 'Active',
    startDate: startDay,
    dueDate: dueDay,
    estimatedHours: estimatedHours !== undefined ? estimatedHours : existingTarget?.estimatedHours,
    dependsOnIds: effectiveDepIds,
  };
  const nextSubtasks = [
    ...existingSubtasks.filter((st) => String(st.id) !== checkId),
    mergedProposal,
  ];

  const warnings = [];
  const effStart = startDay || todayUtcDay();
  const hrs = mergedProposal.estimatedHours != null ? Number(mergedProposal.estimatedHours) : 0;

  if (dueDay && hrs > 0) {
    const subtaskWindowHours = availableWorkingHours(effStart, dueDay, policy);
    if (hrs > subtaskWindowHours) {
      warnings.push({
        severity: 'error',
        code: 'SUBTASK_EXCEEDS_WINDOW_HOURS',
        message: `Subtask requires ${hrs}h, exceeding ${subtaskWindowHours}h available between ${isoDay(effStart)} and ${isoDay(dueDay)}.`,
      });
    }

    if (assignedToId) {
      const capMap = await getMemberCapacityMap(prisma, companyId, [assignedToId], effStart, dueDay, policy);
      const memberCap = capMap[String(assignedToId)];
      if (memberCap) {
        const previousSelfHrs = existingTarget && String(existingTarget.assignedToId) === String(assignedToId)
          ? Number(existingTarget.estimatedHours || 0)
          : 0;
        const projectedHours = Number((memberCap.windowHours - previousSelfHrs + hrs).toFixed(2));
        if (memberCap.windowCapacityHours != null && projectedHours > memberCap.windowCapacityHours) {
          warnings.push({
            severity: 'warning',
            code: 'ASSIGNEE_OVERLOADED',
            message: `Assignee's total workload across all tasks in these dates reaches ${projectedHours}h (above ${memberCap.windowCapacityHours}h available).`,
          });
        }
      }
    }
  }

  const taskAnalysis = evaluateTaskCapacity({
    task: parentTask,
    subtasks: nextSubtasks,
    policy,
  });

  const combinedWarnings = [...warnings];
  for (const w of taskAnalysis.warnings) {
    if (!combinedWarnings.some((existingW) => existingW.code === w.code)) {
      combinedWarnings.push(w);
    }
  }

  if (policy.enforceCapacityBlock && !allowCapacityOverride) {
    const blockingCodes = new Set([
      'SUBTASK_EXCEEDS_WINDOW_HOURS',
      'ASSIGNEE_OVERLOADED',
      'CRITICAL_PATH_EXCEEDS_DEADLINE',
      'NO_WORKING_DAYS',
    ]);
    const blocking = combinedWarnings.find((w) => blockingCodes.has(w.code));
    if (blocking) {
      throw new BadRequestError(`${blocking.message} (Strict capacity enforcement is enabled in company policy.)`);
    }
  }

  return {
    effectiveDepIds,
    warnings: combinedWarnings,
    analysis: taskAnalysis,
  };
}

/**
 * Generates an even, dependency-respecting staggered schedule for active subtasks of a task.
 */
export function buildAutoSchedulePlan({ task, subtasks = [], policy = DEFAULT_SCHEDULING_POLICY, startAnchor = null }) {
  const active = (subtasks || []).filter((st) => st && !st.deletedAt && st.status !== 'Cancelled' && st.status !== 'Completed');
  if (active.length === 0) return [];

  const today = toUtcDay(startAnchor) || todayUtcDay();
  const taskDue = toUtcDay(task?.dueDate);
  const reviewBufferDays = task?.reviewBufferDays != null
    ? Number(task.reviewBufferDays)
    : Number(policy.defaultReviewBufferDays ?? DEFAULT_SCHEDULING_POLICY.defaultReviewBufferDays);

  let targetEnd = taskDue ? subtractWorkingDays(taskDue, reviewBufferDays, policy) : null;
  if (targetEnd && targetEnd < today && taskDue >= today) {
    targetEnd = taskDue;
  }

  const completedOrFrozen = new Map(
    (subtasks || [])
      .filter((st) => st && !st.deletedAt && st.status === 'Completed')
      .map((st) => [String(st.id), st])
  );

  const activeMap = new Map(active.map((st) => [String(st.id), st]));
  const { topoOrder, hasCycle } = computeCriticalPath(active);
  if (hasCycle) {
    throw new BadRequestError('Cannot auto-schedule because subtasks contain a dependency cycle');
  }

  const hoursPerDay = Math.max(1, Number(policy.workHoursPerDay || 8));
  const planned = new Map();

  for (const id of topoOrder) {
    const st = activeMap.get(id);
    const deps = extractDependencyIds(st);

    let earliestStart = new Date(today.getTime());
    for (const depId of deps) {
      const depPlan = planned.get(depId);
      const depCompleted = completedOrFrozen.get(depId);
      const depDue = depPlan ? depPlan.dueDate : toUtcDay(depCompleted?.dueDate);
      if (depDue) {
        const nextWorking = addWorkingDays(depDue, 1, policy);
        if (nextWorking > earliestStart) earliestStart = nextWorking;
      }
    }

    // Ensure earliestStart lands on a working day
    earliestStart = addWorkingDays(earliestStart, 0, policy);
    if (targetEnd && earliestStart > targetEnd) {
      earliestStart = new Date(targetEnd.getTime());
    }

    const hrs = st.estimatedHours != null && Number(st.estimatedHours) > 0
      ? Number(st.estimatedHours)
      : hoursPerDay;
    const neededWorkingDays = Math.max(1, Math.ceil(hrs / hoursPerDay));
    let plannedDue = addWorkingDays(earliestStart, Math.max(0, neededWorkingDays - 1), policy);

    if (targetEnd && plannedDue > targetEnd) {
      plannedDue = new Date(targetEnd.getTime());
    }
    if (plannedDue < earliestStart) {
      plannedDue = new Date(earliestStart.getTime());
    }

    planned.set(id, {
      subtaskId: id,
      title: st.title,
      startDate: earliestStart,
      dueDate: plannedDue,
    });
  }

  return Array.from(planned.values()).map((item) => ({
    ...item,
    startDateIso: isoDay(item.startDate),
    dueDateIso: isoDay(item.dueDate),
  }));
}
