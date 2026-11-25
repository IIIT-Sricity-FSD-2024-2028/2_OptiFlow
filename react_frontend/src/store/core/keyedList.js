import { isAnyOf } from "@reduxjs/toolkit";
import { createApiThunk, isAbortedRejection } from "./createApiThunk";
import { normalizeError } from "./normalizeError";
import { queryKeyOf, shouldFetch } from "./shouldFetch";

// Shared logic for the platform list slices (companies, subscriptions, admin users, support
// access, audit logs). Their list endpoints answer { items, total, page, pageSize, summary }
// and are read with many different filters (a table page, a dropdown of 100 rows, one company's
// audit trail, ...).
//
// So the list cache is keyed by query: state.lists[queryKey] = one entry per distinct query.
// Two consumers asking different questions never overwrite each other, and a slow answer for an
// old page lands in its own entry instead of replacing the page the user is looking at.
//
//   state.lists = { [queryKey]: { status, error, items, total, summary, loadedAt, requestId } }
//   state.order = queryKeys, oldest first (used to cap the cache at MAX_ENTRIES)

export const MAX_ENTRIES = 30;

export const emptyEntry = () => ({
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  items: [],
  total: 0,
  summary: null,
  loadedAt: null,
  requestId: null,
});

// What a consumer sees for a query that was never requested. One frozen object, so selectors
// return a stable reference.
export const EMPTY_ENTRY = Object.freeze(emptyEntry());

export const listState = () => ({ lists: {}, order: [] });

// The query a list call sends: the thunk argument without `force` (a flag, not a filter).
const queryOf = (arg) => {
  if (!arg || typeof arg !== "object" || Array.isArray(arg)) return undefined;
  const { force: _force, ...query } = arg;
  return Object.keys(query).length > 0 ? query : undefined;
};

/**
 * fetchList(query?)  skipped while the same query is loading or still fresh;
 *                    `{ ...query, force: true }` always fetches (Refresh, or after a write).
 * `list(query, options)` must forward `options` ({ signal, abortKey }) to the service wrapper.
 */
export function createListThunk(name, list) {
  return createApiThunk(`${name}/fetch`, (arg, options) => list(queryOf(arg), options), {
    abortable: true,
    condition: (arg, { getState }) => {
      const key = queryKeyOf(arg);
      const entry = getState()[name].lists[key];
      if (!entry) return true;
      return shouldFetch({ status: entry.status, queryKey: key, loadedAt: entry.loadedAt }, arg);
    },
  });
}

const touch = (state, key) => {
  const at = state.order.indexOf(key);
  if (at !== -1) state.order.splice(at, 1);
  state.order.push(key);
  // Drop the oldest entries that are not loading, so the cache cannot grow without bound.
  for (let i = 0; state.order.length > MAX_ENTRIES && i < state.order.length; ) {
    const oldest = state.order[i];
    if (oldest !== key && state.lists[oldest]?.status !== "loading") {
      delete state.lists[oldest];
      state.order.splice(i, 1);
    } else {
      i += 1;
    }
  }
};

const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.items) ? payload.items : [];
};

export function addListCases(builder, fetchList) {
  builder
    .addCase(fetchList.pending, (state, action) => {
      const key = queryKeyOf(action.meta.arg);
      if (!state.lists[key]) state.lists[key] = emptyEntry();
      const entry = state.lists[key];
      entry.status = "loading";
      entry.error = null;
      entry.requestId = action.meta.requestId;
      touch(state, key);
    })
    .addCase(fetchList.fulfilled, (state, action) => {
      const entry = state.lists[queryKeyOf(action.meta.arg)];
      // After logout (or a newer request for the same query) the ids no longer match: ignore.
      if (!entry || entry.requestId !== action.meta.requestId) return;
      const items = rowsOf(action.payload);
      entry.items = items;
      entry.total = Number.isFinite(action.payload?.total) ? action.payload.total : items.length;
      entry.summary = action.payload?.summary ?? null;
      entry.status = "succeeded";
      entry.loadedAt = Date.now();
      entry.requestId = null;
    })
    .addCase(fetchList.rejected, (state, action) => {
      const entry = state.lists[queryKeyOf(action.meta.arg)];
      if (!entry || entry.requestId !== action.meta.requestId) return;
      entry.requestId = null;
      if (isAbortedRejection(action)) {
        // Cancelled and nothing replaced it: back to what we had, never to "failed".
        entry.status = entry.loadedAt ? "succeeded" : "idle";
        entry.error = null;
        return;
      }
      entry.status = "failed";
      entry.error = action.payload ?? normalizeError(action.error);
    });
}

// Mark every cached query as stale, so the next read of it fetches again. Used after a write:
// totals, summaries and filtered views can all have changed.
export function invalidateLists(state) {
  for (const entry of Object.values(state.lists)) entry.loadedAt = null;
}

// Run `reducer` whenever one of these thunks succeeds (a write somewhere else changed our data).
// addMatcher must come after every addCase of the same builder.
export function addInvalidateOn(builder, thunks, reducer = invalidateLists) {
  if (thunks.length === 0) return;
  builder.addMatcher(isAnyOf(...thunks.map((t) => t.fulfilled)), reducer);
}

// ---- mutations --------------------------------------------------------------------------

export const idleMutation = () => ({ status: "idle", error: null });
const IDLE_MUTATION = Object.freeze(idleMutation());

const errorOf = (action) => action.payload ?? normalizeError(action.error);

/**
 * pending / fulfilled / rejected for one entry of `mutations`.
 * Pessimistic: `onFulfilled` runs only after the server said OK. A cancelled request never sets
 * an error; it puts the entry back to idle.
 */
export function addMutationCases(builder, thunk, key, onFulfilled) {
  builder
    .addCase(thunk.pending, (state) => {
      state.mutations[key] = { status: "loading", error: null };
    })
    .addCase(thunk.fulfilled, (state, action) => {
      onFulfilled?.(state, action);
      state.mutations[key] = { status: "succeeded", error: null };
    })
    .addCase(thunk.rejected, (state, action) => {
      if (isAbortedRejection(action)) {
        state.mutations[key] = idleMutation();
        return;
      }
      state.mutations[key] = { status: "failed", error: errorOf(action) };
    });
}

// ---- selectors --------------------------------------------------------------------------

export function makeListSelectors(name) {
  return {
    selectEntry: (state, query) => state[name].lists[queryKeyOf(query)] ?? EMPTY_ENTRY,
    selectMutation: (state, key) => state[name].mutations[key] ?? IDLE_MUTATION,
  };
}
