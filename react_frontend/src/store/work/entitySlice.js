// Shared builder for the four M3 work slices (projects, tasks, subtasks, escalations).
// Every slice gets the same envelope: entity adapter, list status, error, loadedAt,
// and a per-operation `mutations` map. Updates are pessimistic: the store changes only
// on `fulfilled`, using the row the server returned.
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import {
  isAbortedAction,
  mutationFulfilled,
  mutationPending,
  mutationRejected,
  normalizeError,
  resetStore,
} from '../core';

export const idOf = (row) => row?.id;

export const createWorkAdapter = () => createEntityAdapter({ selectId: idOf });

export const initialWorkState = (adapter) =>
  adapter.getInitialState({
    status: 'idle',
    error: null,
    loadedAt: null,
    mutations: {},
  });

/** Rows from the API are arrays after the client's unwrap; tolerate { items } too. */
export const asRows = (payload) => {
  if (Array.isArray(payload)) return payload.filter((r) => r && r.id != null);
  if (Array.isArray(payload?.items)) return payload.items.filter((r) => r && r.id != null);
  return [];
};

/**
 * Builds a slice. `thunks` holds { list, getById, create, update, remove } and
 * `extra(builder, adapter)` adds slice-specific cases (by-task, by-assignee, cross-slice patches).
 */
export const buildWorkSlice = ({ name, adapter, thunks, extra }) =>
  createSlice({
    name,
    initialState: initialWorkState(adapter),
    reducers: {
      clearMutation(state, action) {
        delete state.mutations[action.payload];
      },
    },
    extraReducers: (builder) => {
      builder.addCase(resetStore, () => initialWorkState(adapter));

      // List: replaces the whole collection with what the server returned.
      builder
        .addCase(thunks.list.pending, (state) => {
          state.status = 'loading';
          state.error = null;
        })
        .addCase(thunks.list.fulfilled, (state, action) => {
          adapter.setAll(state, asRows(action.payload));
          state.status = 'succeeded';
          state.loadedAt = Date.now();
        })
        .addCase(thunks.list.rejected, (state, action) => {
          if (isAbortedAction(action)) return;
          state.status = 'failed';
          state.error = action.payload ?? normalizeError(action.error);
        });

      // Detail: merges the (richer) detail row into the store.
      builder
        .addCase(thunks.getById.pending, (state) => mutationPending(state, 'getById'))
        .addCase(thunks.getById.fulfilled, (state, action) => {
          if (action.payload?.id != null) adapter.upsertOne(state, action.payload);
          mutationFulfilled(state, 'getById');
        })
        .addCase(thunks.getById.rejected, (state, action) => mutationRejected(state, 'getById', action));

      builder
        .addCase(thunks.create.pending, (state) => mutationPending(state, 'create'))
        .addCase(thunks.create.fulfilled, (state, action) => {
          const id = action.payload?.id;
          if (id != null) {
            adapter.upsertOne(state, action.payload);
            // Lists come back newest first, so a new row goes to the top.
            state.ids = [id, ...state.ids.filter((x) => x !== id)];
          }
          mutationFulfilled(state, 'create');
        })
        .addCase(thunks.create.rejected, (state, action) => mutationRejected(state, 'create', action));

      builder
        .addCase(thunks.update.pending, (state) => mutationPending(state, 'update'))
        .addCase(thunks.update.fulfilled, (state, action) => {
          if (action.payload?.id != null) adapter.upsertOne(state, action.payload);
          mutationFulfilled(state, 'update');
        })
        .addCase(thunks.update.rejected, (state, action) => mutationRejected(state, 'update', action));

      builder
        .addCase(thunks.remove.pending, (state) => mutationPending(state, 'remove'))
        .addCase(thunks.remove.fulfilled, (state, action) => {
          adapter.removeOne(state, action.meta.arg);
          mutationFulfilled(state, 'remove');
        })
        .addCase(thunks.remove.rejected, (state, action) => mutationRejected(state, 'remove', action));

      extra?.(builder, adapter);
    },
  });

/**
 * True for a rejection a page should show: not a cancelled request and not a fetch
 * skipped by `condition` because the same list was already loading.
 */
export const isReportableError = (err) =>
  Boolean(err) && err.name !== 'ConditionError' && err.code !== 'ABORTED';

/** Skips a list fetch while one is already running (Topbar-style double mounts). */
export const skipWhileLoading = (sliceName) => ({
  condition: (_arg, { getState }) => getState()[sliceName]?.status !== 'loading',
});

/** Standard selectors for a work slice. */
export const buildWorkSelectors = (adapter, sliceName) => {
  const base = adapter.getSelectors((state) => state[sliceName]);
  return {
    selectAll: base.selectAll,
    selectById: base.selectById,
    selectEntities: base.selectEntities,
    selectStatus: (state) => state[sliceName].status,
    selectError: (state) => state[sliceName].error,
    selectLoadedAt: (state) => state[sliceName].loadedAt,
    // True until the first list load finishes; a background refetch does not show a loader again.
    selectFirstLoad: (state) =>
      state[sliceName].status === 'idle' ||
      (state[sliceName].status === 'loading' && state[sliceName].loadedAt == null),
    selectMutation: (state, op) => state[sliceName].mutations[op] ?? { status: 'idle', error: null },
  };
};
