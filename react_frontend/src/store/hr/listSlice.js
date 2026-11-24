import { createSelector } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { createApiThunk, isAbortedRejection } from "../core/createApiThunk";
import { queryKeyOf, shouldFetch } from "../core/shouldFetch";
import { normalizeError } from "../core/normalizeError";
import { isValidId } from "../../services/api/hrRequest";

// Shared list-slice logic for the HR (M5) read slices: users, teams, branches, roles.
// M5-owned; built only on the merged store/core helpers, which it does not change.
//
// State: an entity adapter (ids, entities) plus the shared envelope and
//   queryKey   which query listIds answers (compared by shouldFetch)
//   requestId  the latest list request; any other response is ignored
//   listIds    the rows the latest list query returned, in server order
//   details    per-id fetch status: { [id]: { status, error, requestId } }
// Entities are upserted, never replaced or pruned: a detail fetch can carry fields the
// list leaves out, and a row the server stopped returning stays readable by id but
// drops out of selectAll (which reads through listIds).

export function createListState(adapter) {
  return adapter.getInitialState({
    ...baseState(),
    queryKey: null,
    requestId: null,
    listIds: [],
    details: {},
  });
}

// A row needs a valid string id (UUIDs here): anything else could collide or name a prototype key.
const isRow = (value) => Boolean(value) && typeof value === "object" && isValidId(value.id);

// Own-property reads only, so ids such as "constructor" never resolve through Object.prototype.
const own = (map, id) => (map && Object.hasOwn(map, id) ? map[id] : undefined);

// The query a list call sends: the thunk argument without `force` (a flag, not a filter).
function listQuery(arg) {
  if (!arg || typeof arg !== "object" || Array.isArray(arg)) return undefined;
  const { force: _force, ...query } = arg;
  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * `list(query, options)` and `get(id, options)` must forward `options` ({ signal, abortKey })
 * to the service wrapper.
 *   fetchList(query?)   skipped while the same query is loading or still fresh; `{ force: true }`
 *                       refetches (Refresh, or after a write).
 *   fetchById(id)       skipped while that id is already loading, and for an invalid id (it never
 *                       reaches the URL or the `details` map); no freshness window.
 */
export function createListThunks(name, { list, get }) {
  const fetchList = createApiThunk(`${name}/fetch`, (arg, options) => list(listQuery(arg), options), {
    abortable: true,
    condition: (arg, { getState }) => shouldFetch(getState()[name], arg),
  });
  const fetchById = createApiThunk(`${name}/fetchById`, (id, options) => get(id, options), {
    abortable: true,
    condition: (id, { getState }) => isValidId(id) && own(getState()[name]?.details, id)?.status !== "loading",
  });
  return { fetchList, fetchById };
}

export function addListCases(builder, fetchList, adapter) {
  builder
    .addCase(fetchList.pending, (state, action) => {
      const key = queryKeyOf(action.meta.arg);
      if (key !== state.queryKey) {
        // A different filter: never show the previous filter's rows under the new one.
        state.listIds = [];
        state.loadedAt = null;
      }
      state.queryKey = key;
      state.status = "loading";
      state.error = null;
      state.requestId = action.meta.requestId;
    })
    .addCase(fetchList.fulfilled, (state, action) => {
      // A newer request owns the state; after logout requestId is null and matches nothing.
      if (action.meta.requestId !== state.requestId) return;
      const rows = Array.isArray(action.payload) ? action.payload.filter(isRow) : [];
      adapter.upsertMany(state, rows);
      state.listIds = rows.map((row) => row.id);
      state.status = "succeeded";
      state.loadedAt = Date.now();
      state.requestId = null;
    })
    .addCase(fetchList.rejected, (state, action) => {
      if (action.meta.requestId !== state.requestId) return;
      state.requestId = null;
      if (isAbortedRejection(action)) {
        // Cancelled, nothing replaced it: back to what we had, never to "failed".
        state.status = state.loadedAt ? "succeeded" : "idle";
        state.error = null;
        return;
      }
      state.status = "failed";
      state.error = action.payload ?? normalizeError(action.error);
    });
}

export function addDetailCases(builder, fetchById, adapter) {
  // Optional chaining is required: after resetStore `details` is {} and a late response
  // for an id must be ignored, not crash the reducer.
  const current = (state, action) => {
    const entry = own(state.details, action.meta.arg);
    return entry && entry.requestId === action.meta.requestId ? entry : null;
  };
  builder
    .addCase(fetchById.pending, (state, action) => {
      state.details[action.meta.arg] = { status: "loading", error: null, requestId: action.meta.requestId };
    })
    .addCase(fetchById.fulfilled, (state, action) => {
      const entry = current(state, action);
      if (!entry) return;
      if (isRow(action.payload)) adapter.upsertOne(state, action.payload);
      entry.status = "succeeded";
      entry.requestId = null;
    })
    .addCase(fetchById.rejected, (state, action) => {
      const entry = current(state, action);
      if (!entry) return;
      entry.requestId = null;
      if (isAbortedRejection(action)) {
        entry.status = "idle";
        entry.error = null;
        return;
      }
      entry.status = "failed";
      entry.error = action.payload ?? normalizeError(action.error);
    });
}

export function makeListSelectors(name) {
  const selectAll = createSelector(
    [(state) => state[name].listIds, (state) => state[name].entities],
    (listIds, entities) => listIds.map((id) => entities[id]).filter(Boolean),
  );
  return {
    selectAll,
    selectById: (state, id) => own(state[name].entities, id),
    selectStatus: (state) => state[name].status,
    selectError: (state) => state[name].error,
    selectLoadedAt: (state) => state[name].loadedAt,
    selectDetailStatus: (state, id) => own(state[name].details, id)?.status ?? "idle",
    selectDetailError: (state, id) => own(state[name].details, id)?.error ?? null,
  };
}
