import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";
import { login, logout, platformLogin, registerCompany, restoreSession } from "./thunks";

const idleMutation = () => ({status:"idle",error:null});

// state.auth
// ├─ status, error, loadedAt      ← the shared envelope, used for RESTORE SESSION only
// ├─ mutations
// │    ├─ login           { status, error }
// │    ├─ platformLogin   { status, error }
// │    ├─ registerCompany { status, error }
// │    └─ logout          { status, error }
// ├─ user            null | { ...identity, role, isPlatform }
// ├─ sessionNotice   null | "session_expired" | "plan_expired"
// └─ initialized     false until the first restore attempt has finished

export const initialState = () =>({
    ...baseState(),
    mutations:{
        login:idleMutation(),
        platformLogin: idleMutation(),
        registerCompany: idleMutation(),
        logout: idleMutation(),
    },
    user:null,
    sessionNotice: null,
    initialized: false,
});

// A restore that fails with these statuses tells the Login page why the user was signed out.
const NOTICE_BY_STATUS = { 401: "session_expired", 402: "plan_expired" };

const errorOf = (action) => action.payload ?? normalizeError(action.error);

/**
 * pending / fulfilled / rejected for one entry of `mutations`.
 * `onFulfilled(state, action)` applies the result (pessimistic: only after success).
 * A cancelled request never sets an error; it puts the entry back to idle.
 */
const addMutationCases = (builder, thunk, key, onFulfilled) => {
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
};

const signIn = (state, action) => {
    state.user = action.payload?.user ?? null;
    state.sessionNotice = null;
    state.initialized = true;
};

const slice = createSlice({
    name:"auth",
    initialState:initialState(),
    reducers:{},
    extraReducers: (builder) => {
        // Restore session: the only operation that uses the shared status / error envelope.
        builder
            .addCase(restoreSession.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(restoreSession.fulfilled, (state, action) => {
                state.user = action.payload?.user ?? null;
                state.status = "succeeded";
                state.loadedAt = Date.now();
                state.initialized = true;
            })
            .addCase(restoreSession.rejected, (state, action) => {
                if (isAbortedRejection(action)) return;
                const error = errorOf(action);
                state.user = null;
                state.status = "failed";
                state.error = error;
                state.sessionNotice = NOTICE_BY_STATUS[error?.status] ?? null;
                state.initialized = true;
            });

        addMutationCases(builder, login, "login", signIn);
        addMutationCases(builder, platformLogin, "platformLogin", signIn);
        // Registering keeps the user signed out: they see a success screen first.
        addMutationCases(builder, registerCompany, "registerCompany");
        // logout dispatches resetStore before it finishes, so by now every slice (this one
        // included) is back to its initial state. Keep the app initialised so there is no
        // blank "starting up" flash before the redirect to Login.
        addMutationCases(builder, logout, "logout", (state) => {
            state.user = null;
            state.initialized = true;
        });
    },
});

export default slice.reducer;
