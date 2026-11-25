import { isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";

// Write tracking for the HR (M5) list slices built on listSlice.js.
//   state.mutations[key] = { status, error, requestId, pending }
//   requestId  the latest write under this key; only it sets status and error
//   pending    every write under this key still running

const own = (map, key) => (map && Object.hasOwn(map, key) ? map[key] : undefined);

/**
 * Makes the next fetch reload, whatever is cached. A list request already running may have
 * been read before the write, so its response is discarded (it no longer matches requestId).
 */
export function invalidateList(state) {
  state.loadedAt = null;
  if (state.status === "loading") {
    state.status = "idle";
    state.requestId = null;
  }
}

/**
 * `keyOf(arg)` names the operation. `onSuccess(state, action)` runs for every write that
 * succeeds, even when a newer one under the same key has started. After resetStore the entry
 * is gone, so a write that finishes after logout matches nothing.
 */
export function addWriteCases(builder, thunk, keyOf, onSuccess) {
  const settle = (state, action) => {
    const entry = own(state.mutations, keyOf(action.meta.arg));
    if (!entry || !entry.pending.includes(action.meta.requestId)) return null;
    entry.pending = entry.pending.filter((id) => id !== action.meta.requestId);
    return { entry, latest: entry.requestId === action.meta.requestId };
  };
  builder
    .addCase(thunk.pending, (state, action) => {
      const key = keyOf(action.meta.arg);
      const { requestId } = action.meta;
      const pending = own(state.mutations, key)?.pending ?? [];
      state.mutations[key] = { status: "loading", error: null, requestId, pending: [...pending, requestId] };
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const settled = settle(state, action);
      if (!settled) return;
      if (settled.latest) settled.entry.status = "succeeded";
      onSuccess(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      const settled = settle(state, action);
      if (!settled || !settled.latest) return;
      const aborted = isAbortedRejection(action);
      settled.entry.status = aborted ? "idle" : "failed";
      settled.entry.error = aborted ? null : action.payload ?? normalizeError(action.error);
    });
}

export function makeWriteSelectors(name) {
  return {
    selectWriteStatus: (state, key) => own(state[name].mutations, key)?.status ?? "idle",
    selectWriteError: (state, key) => own(state[name].mutations, key)?.error ?? null,
  };
}
