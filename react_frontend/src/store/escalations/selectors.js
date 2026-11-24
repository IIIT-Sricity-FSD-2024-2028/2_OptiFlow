import { createSelector } from '@reduxjs/toolkit';
import { buildWorkSelectors } from '../work/entitySlice';
import { escalationsAdapter } from './slice';

const s = buildWorkSelectors(escalationsAdapter, 'escalations');

export const selectAllEscalations = s.selectAll;
export const selectEscalationById = s.selectById;
export const selectEscalationsStatus = s.selectStatus;
export const selectEscalationsError = s.selectError;
export const selectEscalationsLoading = s.selectFirstLoad;
export const selectEscalationMutation = s.selectMutation;

export const selectOpenEscalations = createSelector([selectAllEscalations], (rows) =>
  rows.filter((e) => !['Resolved', 'Closed', 'Rejected'].includes(e.status)),
);
export const selectEscalationsByTaskId = createSelector(
  [selectAllEscalations, (_state, taskId) => taskId],
  (rows, taskId) => rows.filter((e) => String(e.taskId) === String(taskId)),
);
