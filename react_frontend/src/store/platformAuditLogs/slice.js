import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { addInvalidateOn, addListCases, listState } from "../core/keyedList";
import { fetchAuditLogs } from "./thunks";
import { createCompany, updateCompany } from "../platformCompanies/thunks";
import { createPlan, updatePlan } from "../platformPlans/thunks";
import { createSubscription, updateSubscription } from "../platformSubscriptions/thunks";
import { createAdminUser, updateAdminUser, resetAdminPassword } from "../platformAdminUsers/thunks";
import { createSupportGrant, revokeSupportGrant } from "../platformSupportAccess/thunks";

// state.platformAuditLogs: lists (one cached page per query), order. Read-only.
export const initialState = () => ({ ...baseState(), ...listState() });

const slice = createSlice({
  name: "platformAuditLogs",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchAuditLogs);

    // Every platform write adds a row to the audit trail, so a cached view of it is stale.
    addInvalidateOn(builder, [
      createCompany, updateCompany,
      createPlan, updatePlan,
      createSubscription, updateSubscription,
      createAdminUser, updateAdminUser, resetAdminPassword,
      createSupportGrant, revokeSupportGrant,
    ]);
  },
});

export default slice.reducer;
