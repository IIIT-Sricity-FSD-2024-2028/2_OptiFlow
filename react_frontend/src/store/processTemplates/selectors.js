import { createSelector } from '@reduxjs/toolkit';

const selectSlice = state => state.processTemplates;
export const selectAllProcessTemplates = createSelector(
  [state => selectSlice(state).listIds, state => selectSlice(state).entities],
  (ids, entities) => ids.map(id => entities[id]),
);
export const selectProcessTemplateById = (state, id) => selectSlice(state).entities[id];
export const selectProcessTemplatesStatus = state => selectSlice(state).status;
export const selectProcessTemplatesError = state => selectSlice(state).error;
export const selectProcessTemplateDetailRequest = (state, id) => selectSlice(state).details[id];
export const selectProcessTemplateMutation = (state, key) => selectSlice(state).mutations[key];
const emptySteps = [];
export const selectTemplateSteps = (state, id) => selectProcessTemplateById(state, id)?.steps ?? emptySteps;
export const selectCreatingProcessTemplate = state => Object.entries(selectSlice(state).mutations)
  .some(([key, request]) => key.startsWith('create:') && request.status === 'loading');
