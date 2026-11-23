import { createSelector } from '@reduxjs/toolkit';
import { buildWorkSelectors } from '../work/entitySlice';
import { projectsAdapter } from './slice';

const s = buildWorkSelectors(projectsAdapter, 'projects');

export const selectAllProjects = s.selectAll;
export const selectProjectById = s.selectById;
export const selectProjectEntities = s.selectEntities;
export const selectProjectsStatus = s.selectStatus;
export const selectProjectsError = s.selectError;
export const selectProjectsLoadedAt = s.selectLoadedAt;
export const selectProjectsLoading = s.selectFirstLoad;
export const selectProjectMutation = s.selectMutation;

/** Projects that are not closed (Completed / Cancelled / Archived). */
export const selectOpenProjects = createSelector([selectAllProjects], (projects) =>
  projects.filter((p) => !['Completed', 'Cancelled', 'Archived'].includes(p.status)),
);
