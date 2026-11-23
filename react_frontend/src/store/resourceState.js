import { createEntityAdapter } from '@reduxjs/toolkit';
import { isAbortedRejection } from './core/createApiThunk';
import { queryKeyOf } from './core/shouldFetch';

export const rows = createEntityAdapter();

export function resourceState(extra) {
  return rows.getInitialState({
    status: 'idle', error: null, loadedAt: null, queryKey: null,
    listIds: [], listRequest: null, changedDuringLoad: {}, details: {}, mutations: {}, ...extra,
  });
}

// Keep list membership separate from detail rows fetched outside the current query.
export function listCases(builder, thunk) {
  builder.addCase(thunk.pending, (state, action) => {
    state.listRequest = action.meta.requestId;
    state.changedDuringLoad = {};
    const key = queryKeyOf(action.meta.arg);
    if (key !== state.queryKey) {
      state.listIds = [];
      state.loadedAt = null;
    }
    state.queryKey = key;
    state.status = 'loading';
    state.error = null;
  }).addCase(thunk.fulfilled, (state, action) => {
    if (state.listRequest !== action.meta.requestId) return;
    const changed = state.changedDuringLoad;
    rows.upsertMany(state, action.payload.filter(row => !changed[row.id]));
    const ids = action.payload.map(row => row.id).filter(id => !changed[id] || state.entities[id]);
    const added = state.listIds.filter(id => changed[id] && !ids.includes(id));
    state.listIds = [...added, ...ids];
    state.changedDuringLoad = {};
    state.status = 'succeeded';
    state.loadedAt = Date.now();
    state.listRequest = null;
  }).addCase(thunk.rejected, (state, action) => {
    if (state.listRequest !== action.meta.requestId) return;
    state.listRequest = null;
    state.status = isAbortedRejection(action) ? (state.loadedAt ? 'succeeded' : 'idle') : 'failed';
    state.error = isAbortedRejection(action) ? null : action.payload ?? action.error;
  });
}

// A result belongs to the most recent request for its key, including across logout.
export function requestCases(builder, thunk, group, keyOf, apply) {
  builder.addCase(thunk.pending, (state, action) => {
    state[group][keyOf(action)] = { requestId: action.meta.requestId, status: 'loading', error: null };
  }).addCase(thunk.fulfilled, (state, action) => {
    const request = state[group][keyOf(action)];
    if (request?.requestId !== action.meta.requestId) return;
    request.status = 'succeeded';
    if (group === 'mutations') {
      state.loadedAt = null;

    }
    apply(state, action);
  }).addCase(thunk.rejected, (state, action) => {
    const request = state[group][keyOf(action)];
    if (request?.requestId !== action.meta.requestId) return;
    request.status = isAbortedRejection(action) ? 'idle' : 'failed';
    request.error = isAbortedRejection(action) ? null : action.payload ?? action.error;
  });
}

export function removeRow(state, id) {
  if (state.listRequest) state.changedDuringLoad[id] = true;
  rows.removeOne(state, id);
  state.listIds = state.listIds.filter(item => item !== id);
  delete state.details[id];
}

export function includeRow(state, row) {
  if (state.listRequest) state.changedDuringLoad[row.id] = true;
  rows.upsertOne(state, row);
  if (!state.listIds.includes(row.id)) state.listIds.unshift(row.id);
}
