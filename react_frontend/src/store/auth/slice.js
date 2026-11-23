import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";

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

const slice = createSlice({
    name:"auth",
    initialState:initialState(),
    reducers:{}
});

export default slice.reducer;