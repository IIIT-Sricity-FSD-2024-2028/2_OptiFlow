// PLACEHOLDER store core, added by M3 so the PM/TL slices can run before M2's
// step 1 lands. M2 owns this folder: replace it with the real core and keep the
// exported names (createApiThunk, normalizeError, resetStore, isAbortedAction).
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import { isAbortError } from '../../services/api/client';

/** Clears every slice. Dispatch on logout so one user's data never shows for the next. */
export const resetStore = createAction('store/reset');

/** Turns an ApiError (or anything thrown) into a plain, serialisable object. */
export const normalizeError = (err) => ({
  message: err?.message || 'Something went wrong',
  status: err?.status ?? 0,
  code: err?.code ?? null,
  details: err?.details ?? null,
});

/**
 * createAsyncThunk wrapper. `call(arg, { signal })` calls a services/api function.
 * Errors come back through rejectWithValue as { message, status, code, details }.
 */
export const createApiThunk = (type, call, options) =>
  createAsyncThunk(
    type,
    async (arg, { signal, rejectWithValue }) => {
      try {
        return await call(arg, { signal });
      } catch (err) {
        return rejectWithValue(normalizeError(err));
      }
    },
    options,
  );

/** True when a rejected action is a cancelled request; reducers ignore those. */
export const isAbortedAction = (action) =>
  action?.meta?.aborted || action?.payload?.code === 'ABORTED' || isAbortError(action?.error);

/** Per-operation status helpers for the `mutations` map in each slice. */
export const mutationPending = (state, name) => {
  state.mutations[name] = { status: 'loading', error: null };
};
export const mutationFulfilled = (state, name) => {
  state.mutations[name] = { status: 'succeeded', error: null };
};
export const mutationRejected = (state, name, action) => {
  if (isAbortedAction(action)) {
    state.mutations[name] = { status: 'idle', error: null };
    return;
  }
  state.mutations[name] = { status: 'failed', error: action.payload ?? normalizeError(action.error) };
};
