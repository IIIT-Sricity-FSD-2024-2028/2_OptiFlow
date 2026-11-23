import { createSelector } from '@reduxjs/toolkit';

const selectSlice = state => state.processInstances;
export const selectAllProcessInstances = createSelector(
  [state => selectSlice(state).listIds, state => selectSlice(state).entities],
  (ids, entities) => ids.map(id => entities[id]),
);
export const selectProcessInstanceById = (state, id) => selectSlice(state).entities[id];
export const selectProcessInstancesStatus = state => selectSlice(state).status;
export const selectProcessInstancesError = state => selectSlice(state).error;
export const selectProcessInstanceDetailRequest = (state, id) => selectSlice(state).details[id];
export const selectProcessInstanceMutation = (state, key) => selectSlice(state).mutations[key];
const emptySteps = [];
export const selectInstanceSteps = (state, id) => selectProcessInstanceById(state, id)?.steps ?? emptySteps;
export const selectCreatingProcessInstance = state => Object.entries(selectSlice(state).mutations)
  .some(([key, request]) => key.startsWith('create:') && request.status === 'loading');
