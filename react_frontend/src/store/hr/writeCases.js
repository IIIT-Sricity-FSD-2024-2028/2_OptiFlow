import { createApiThunk, isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";
import { dropRowById, invalidateReads } from "./listSlice";

// Writes for the HR (M5) list slices built on listSlice.js.
//   state.mutations[key] = { status, error, requestId }   the last write under that key
//   state.pendingWrites  = request ids of every HR write still running, in any HR slice
// resetStore clears both, so a write that finishes after logout matches nothing.

const own = (map, key) => (map && Object.hasOwn(map, key) ? map[key] : undefined);

// HR rows embed each other (users carry roles and teams, branches carry their manager) and one
// write can change rows elsewhere (deleting a team revokes its role assignments), so any HR
// write that may have reached the database makes every HR list stale.
const HR_WRITE = /^(users|teams|branches|roles|roleAssignments)\/(?!fetch)\w+\/(pending|fulfilled|rejected)$/;

// A failed write that changed nothing and says nothing about the cached rows: refused before any
// work. Every other failure may have been saved (timeout, lost connection, 5xx) or means the cached
// rows are out of date (this backend reports conflicts as 400, 403, 404 and 409).
// After a timeout the server may still be saving: pages should reload with { force: true }.
const UNTOUCHED = new Set([401, 402, 429]);
const changedNothing = (error) => error?.code === "BAD_ID" || UNTOUCHED.has(error?.status);

/**
 * A write thunk. One write per key at a time: a second dispatch while the key is running sends
 * nothing (no double submits, no saves overtaking each other) and its unwrap() rejects with a
 * ConditionError, so pages disable the button while select...WriteStatus is "loading".
 */
export function createWriteThunk(name, operation, call, keyOf) {
  return createApiThunk(`${name}/${operation}`, call, {
    condition: (arg, { getState }) => own(getState()[name].mutations, keyOf(arg))?.status !== "loading",
  });
}

/** Tracks one write. `onSuccess(state, action)` runs when it succeeds. */
export function addWriteCases(builder, thunk, keyOf, onSuccess) {
  // Only the write that set the entry settles it; after resetStore nothing matches.
  const entryOf = (state, action) => {
    const entry = own(state.mutations, keyOf(action.meta.arg));
    return entry?.requestId === action.meta.requestId ? entry : null;
  };
  builder
    .addCase(thunk.pending, (state, action) => {
      state.mutations[keyOf(action.meta.arg)] = { status: "loading", error: null, requestId: action.meta.requestId };
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const entry = entryOf(state, action);
      if (!entry) return;
      entry.status = entry.dismissed ? "idle" : "succeeded";
      onSuccess?.(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      const entry = entryOf(state, action);
      if (!entry) return;
      const silent = entry.dismissed || isAbortedRejection(action);
      entry.status = silent ? "idle" : "failed";
      entry.error = silent ? null : action.payload ?? normalizeError(action.error);
    });
}

/** Makes this slice stale after any HR write. A matcher, so call it after every addCase. */
export function addStaleAfterWrites(builder) {
  builder.addMatcher(
    (action) => HR_WRITE.test(action.type),
    (state, action) => {
      const { requestId, requestStatus } = action.meta;
      if (requestStatus === "pending") {
        state.pendingWrites.push(requestId);
        return;
      }
      if (!state.pendingWrites.includes(requestId)) return;
      state.pendingWrites = state.pendingWrites.filter((id) => id !== requestId);
      if (requestStatus === "fulfilled" || !changedNothing(action.payload)) invalidateReads(state);
    },
  );
}

/** onSuccess for a delete: the row goes at once; the rest of the list waits for the reload. */
export const dropRow = (adapter, idOf = (arg) => arg) => (state, action) => {
  dropRowById(state, adapter, idOf(action.meta.arg));
};

/**
 * Reducer: forgets the outcome under a key (dispatch when a form opens). A running write stays
 * "loading" so it cannot be sent twice, but its result belongs to the closed form and is not shown.
 */
export function clearWriteStatus(state, action) {
  const entry = own(state.mutations, action.payload);
  if (entry?.status === "loading") entry.dismissed = true;
  else delete state.mutations[action.payload];
}

export function makeWriteSelectors(name) {
  return {
    selectWriteStatus: (state, key) => own(state[name].mutations, key)?.status ?? "idle",
    selectWriteError: (state, key) => own(state[name].mutations, key)?.error ?? null,
  };
}
