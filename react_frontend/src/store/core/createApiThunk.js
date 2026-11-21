import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeError } from "./normalizeError";

/**
 * Builds a thunk around one service call so every slice does it the same way.
 *
 *   export const fetchMetrics = createApiThunk(
 *     "platformMetrics/fetch",
 *     (_arg, options) => platform.metrics(options),
 *     { abortable: true },
 *   );
 *
 * `call(arg, options)` receives `options = { signal, abortKey? }` and must forward it to
 * `apiClient` (service wrappers take a trailing `options` argument for this).
 *
 *  - Reads  -> `abortable: true`: gets an abortKey of "type:arguments", so a newer identical
 *              read cancels the older one (the client turns that into an ABORTED error).
 *  - Writes -> leave `abortable` off: a mutation must never be cancelled by another one.
 *  - Failures go through normalizeError and rejectWithValue, so `action.payload` is always
 *    a plain { message, status, code, details } object (serializable).
 *  - `condition` is passed straight to createAsyncThunk (return false to skip the call).
 */
export function createApiThunk(typePrefix, call, { abortable = false, condition } = {}) {
  return createAsyncThunk(
    typePrefix,
    async (arg, { signal, rejectWithValue }) => {
      const options = { signal };
      if (abortable) options.abortKey = `${typePrefix}:${JSON.stringify(arg ?? null)}`;
      try {
        return await call(arg, options);
      } catch (err) {
        return rejectWithValue(normalizeError(err));
      }
    },
    condition ? { condition } : undefined,
  );
}

/**
 * True when a rejected action is a cancel, not a real failure. Reducers should skip it:
 * the newer request that cancelled it is still running and will set the final state.
 */
export function isAbortedRejection(action) {
  return Boolean(action?.meta?.aborted) || action?.payload?.code === "ABORTED";
}
