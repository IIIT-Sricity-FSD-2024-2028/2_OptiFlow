import { createSelector } from '@reduxjs/toolkit';
import { buildWorkSelectors } from '../work/entitySlice';
import { subtasksAdapter } from './slice';

const s = buildWorkSelectors(subtasksAdapter, 'subtasks');

export const selectAllSubtasks = s.selectAll;
export const selectSubtaskById = s.selectById;
export const selectSubtasksStatus = s.selectStatus;
export const selectSubtasksError = s.selectError;
export const selectSubtasksLoading = s.selectFirstLoad;
export const selectSubtaskMutation = s.selectMutation;

export const selectSubtasksByTaskId = createSelector(
  [selectAllSubtasks, (_state, taskId) => taskId],
  (subtasks, taskId) => subtasks.filter((st) => String(st.taskId) === String(taskId)),
);
export const selectSubtasksInReview = createSelector([selectAllSubtasks], (subtasks) =>
  subtasks.filter((st) => st.status === 'In_Review'),
);
