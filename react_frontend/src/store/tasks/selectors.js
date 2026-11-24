import { createSelector } from '@reduxjs/toolkit';
import { buildWorkSelectors } from '../work/entitySlice';
import { tasksAdapter } from './slice';

const s = buildWorkSelectors(tasksAdapter, 'tasks');

export const selectAllTasks = s.selectAll;
export const selectTaskById = s.selectById;
export const selectTaskEntities = s.selectEntities;
export const selectTasksStatus = s.selectStatus;
export const selectTasksError = s.selectError;
export const selectTasksLoadedAt = s.selectLoadedAt;
export const selectTasksLoading = s.selectFirstLoad;
export const selectTaskMutation = s.selectMutation;

const CLOSED = ['Completed', 'Cancelled', 'Archived'];

/** Derived views used by the PM and Team Leader dashboards. */
export const selectOpenTasks = createSelector([selectAllTasks], (tasks) =>
  tasks.filter((t) => !CLOSED.includes(t.status)),
);
export const selectTasksInReview = createSelector([selectAllTasks], (tasks) =>
  tasks.filter((t) => t.status === 'In_Review'),
);
export const selectOverdueTasks = createSelector([selectOpenTasks], (tasks) => {
  const now = Date.now();
  return tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
});
export const selectTasksByProjectId = createSelector(
  [selectAllTasks, (_state, projectId) => projectId],
  (tasks, projectId) => tasks.filter((t) => String(t.projectId) === String(projectId)),
);
export const selectTasksByAssigneeId = createSelector(
  [selectAllTasks, (_state, userId) => userId],
  (tasks, userId) => tasks.filter((t) => String(t.assignedToId ?? t.assignedTo?.id) === String(userId)),
);
