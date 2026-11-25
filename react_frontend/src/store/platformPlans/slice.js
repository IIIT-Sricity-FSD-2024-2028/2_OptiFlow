import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";
import { queryKeyOf } from "../core/shouldFetch";
import { fetchPlans,createPlan,updatePlan } from "./thunks";

const idleMutation = () => (
    {
        status:"idle",
        error:null
    }
);

export const initialState = () =>({
    ...baseState(),
    mutations: {create:idleMutation(),update:idleMutation()},
    data: [],
    queryKey:null,
    requestId:null,
});

const errorOf = (action) => action.payload ?? normalizeError(action.error);

// Put a saved plan into the list: replace it if it is there, add it if not.
// The server sorts by name, so we keep the same order.
const upsert = (state,plan)=>{
    if(!plan?.id) return;
    const i = state.data.findIndex((p)=>p.id === plan.id);
    if (i==-1) state.data.push(plan);
    else state.data[i] = plan;
    state.data.sort((a,b)=>a.name.localeCompare(b.name));
}

//pending / fulfilled / rejected for one entry of mutations.
//Pessimistic Updates: meaning list changes to fulfilled, only after the server says ok.
const addMutationCases = (builder,thunk,key)=>{
    builder
        .addCase(thunk.pending,(state)=>{
            state.mutations[key] = {status:"loading",error:null};
        })
        .addCase(thunk.fulfilled,(state,action)=>{
            upsert(state,action.payload);
            state.mutations[key] = {status:"succeeded",error:null};
        })
        .addCase(thunk.rejected,(state,action)=>{
            if(isAbortedRejection(action)){
                state.mutations[key] = idleMutation();
                return;
            }
            state.mutations[key] = {status:"failed",error:errorOf(action)};
        });
};

const slice = createSlice({
    name:"platformPlans",
    initialState:initialState(),
    reducers:{},
    extraReducers:(builder)=>{
        builder
            .addCase(fetchPlans.pending,(state,action)=>{
                state.status = "loading";
                state.error = null;
                state.queryKey = queryKeyOf(action.meta.arg);
                state.requestId = action.meta.requestId;
            })
            .addCase(fetchPlans.fulfilled,(state,action)=>{
                if(action.meta.requestId !== state.requestId) return; //duplicated request
                state.status = "succeeded";
                state.data = action.payload?.items??[];
                state.loadedAt = Date.now();
            })
            .addCase(fetchPlans.rejected,(state,action)=>{
                if(action.meta.requestId !== state.requestId) return; //suspended request
                if(isAbortedRejection(action)){
                    state.status = state.loadedAt ? "succeeded":"idle";
                    return;
                }
                state.status = "failed";
                state.error = errorOf(action);
            });
        addMutationCases(builder,createPlan,"create");
        addMutationCases(builder,updatePlan,"update");
    },
});

export default slice.reducer;