import { createApiThunk } from "../core/createApiThunk";
import { shouldFetch } from "../core/shouldFetch";
import * as platformApi from "../../services/api/platform";
import { should } from "vitest";

//Read only Thunk, can be cancelled. Skippped if the same query is loading or fresh
export const fetchPlans = createApiThunk("platformPlans/fetch",
    (_arg,options)=>platformApi.listPlans(options),
    {
        abortable:true,
        condition: (arg,{ getState }) => shouldFetch(getState().platformPlans,arg),
    },
);

//Mutation: createPlan(payload). The server returns the saved plan
export const createPlan = createApiThunk(
    "platformPlans/create",
    (body,options)=>platformApi.createPlan(body,options),
);

//Mutation: updatePlan({ id, body}). used for editing and for archive/unarchiving plans
export const updatePlan = createApiThunk(
    "platformPlans/update",
    ({ id, body},options)=> platformApi.updatePlan(id,body,options),
);