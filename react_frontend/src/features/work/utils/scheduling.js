// Shared client-side scheduling helpers mirroring backend scheduling.service.js
export const DEFAULT_POLICY = {
  workHoursPerDay: 8,
  workingDays: [1, 2, 3, 4, 5],
  defaultReviewBufferDays: 1,
  enforceCapacityBlock: false,
  holidays: [],
};

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

export function isWorkingDay(date, policy = DEFAULT_POLICY) {
  const d = toUtcDay(date);
  if (!d) return false;
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  const workingDays = policy?.workingDays?.length ? policy.workingDays : DEFAULT_POLICY.workingDays;
  if (!workingDays.includes(wd)) return false;
  const holidays = Array.isArray(policy?.holidays) ? policy.holidays : [];
  const dayStr = isoDay(d);
  return !holidays.some((h) => (typeof h === 'string' ? h : h?.date) === dayStr);
}

export function countWorkingDays(startDate, endDate, policy = DEFAULT_POLICY) {
  const start = toUtcDay(startDate);
  const end = toUtcDay(endDate);
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let ms = start.getTime(); ms <= end.getTime(); ms += MS_PER_DAY) {
    if (isWorkingDay(new Date(ms), policy)) count += 1;
  }
  return count;
}

export function availableWorkingHours(startDate, endDate, policy = DEFAULT_POLICY) {
  const hrs = Number(policy?.workHoursPerDay || DEFAULT_POLICY.workHoursPerDay);
  return Number((countWorkingDays(startDate, endDate, policy) * hrs).toFixed(2));
}

export function getDependencyIds(subtask) {
  if (Array.isArray(subtask?.dependsOnIds)) return subtask.dependsOnIds.map(String);
  if (Array.isArray(subtask?.dependencies)) {
    return subtask.dependencies.map((d) => String(d.dependsOnSubtaskId || d.id));
  }
  return [];
}

export function getIncompletePrerequisites(subtask, allSubtasks = []) {
  const subtaskMap = new Map(allSubtasks.map((st) => [String(st.id || st.subtaskId), st]));
  const deps = Array.isArray(subtask?.dependencies) ? subtask.dependencies : [];
  if (deps.length > 0 && deps[0]?.dependsOnSubtask) {
    return deps
      .map((d) => d.dependsOnSubtask)
      .filter((p) => p && String(p.status || '') !== 'Completed');
  }
  return getDependencyIds(subtask)
    .map((id) => subtaskMap.get(id))
    .filter((p) => p && String(p.status || '') !== 'Completed');
}
