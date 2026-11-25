import { createSelector } from "@reduxjs/toolkit";

//Pages read the store only through these.
export const selectPlans = (state)=> state.platformPlans.data;
export const selectPlansStatus = (state) =>state.platformPlans.status;
export const selectPlansError = (state) =>state.platformPlans.error;
export const selectPlansLoadedAt = (state) => state.platformPlans.loadedAt;

//Derived lists.createSelector remembers the last result,so the array is only rebuilt.
//when 'data' changes. A plain .filter() in a selector would return a new array in every call.
//and make every component using it re-render.

export const selectActivePlans = createSelector([selectPlans],(plans)=>
    plans.filter((p)=>p.isActive!==false),
);

export const selectArchivedPlans = createSelector([selectPlans],(plans)=>
    plans.filter((p)=>p.isActive === false),
);

export const selectPlanById = (state,id) => state.platformPlans.data.find((p)=>p.id === id);

//save status for the forms: {status,error}
export const selectCreatePlanMutation = (state)=> state.platformPlans.mutations.create;
export const selectUpdatePlanMutation = (state) => state.platformPlans.mutations.update;