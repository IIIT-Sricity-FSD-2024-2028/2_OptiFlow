// Public selectors for state.auth. Pages and AuthContext read the store through these only.

export const selectAuthUser = (state) => state.auth.user;

export const selectAuthIsPlatform = (state) => Boolean(state.auth.user?.isPlatform);

/** True until the first restore attempt has finished (the app shows its start-up loader). */
export const selectAuthLoading = (state) => !state.auth.initialized;

export const selectSessionNotice = (state) => state.auth.sessionNotice;

export const selectRestoreStatus = (state) => state.auth.status;

export const selectRestoreError = (state) => state.auth.error;

/** { status, error } for one operation: login, platformLogin, registerCompany or logout. */
export const selectAuthMutation = (state, op) =>
  state.auth.mutations[op] ?? { status: "idle", error: null };
