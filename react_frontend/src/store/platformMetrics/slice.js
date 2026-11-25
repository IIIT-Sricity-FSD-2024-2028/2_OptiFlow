import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";
import { queryKeyOf } from "../core/shouldFetch";
import { addInvalidateOn } from "../core/keyedList";
import { fetchPlatformMetrics } from "./thunks";
import { createCompany, updateCompany } from "../platformCompanies/thunks";
import { createPlan, updatePlan } from "../platformPlans/thunks";
import { createSubscription, updateSubscription } from "../platformSubscriptions/thunks";
import { createAdminUser, updateAdminUser } from "../platformAdminUsers/thunks";
import { createSupportGrant, revokeSupportGrant } from "../platformSupportAccess/thunks";

// The shared envelope (status, error, loadedAt, mutations) plus what a read slice needs:
//   data       the last result (kept while a refresh is running, so the page does not blank out)
//   queryKey   which query `data` answers (compared by shouldFetch)
//   requestId  the latest request; older responses are ignored
export const initialState = () => ({
  ...baseState(),
  data: null,
  queryKey: null,
  requestId: null,
});

const slice = createSlice({
  name: "platformMetrics",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatformMetrics.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.queryKey = queryKeyOf(action.meta.arg);
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchPlatformMetrics.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return; // a newer request owns the state
        state.status = "succeeded";
        state.data = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchPlatformMetrics.rejected, (state, action) => {
        if (action.meta.requestId !== state.requestId) return; // superseded: ignore
        if (isAbortedRejection(action)) {
          // Cancelled and nothing replaced it: go back to what we had, never to "failed".
          state.status = state.loadedAt ? "succeeded" : "idle";
          return;
        }
        state.status = "failed";
        state.error = action.payload ?? normalizeError(action.error);
      });

    // The numbers on the dashboard (companies, plan distribution, needs attention, recent
    // activity) change with these writes, so the next read of the metrics must fetch again.
    addInvalidateOn(
      builder,
      [
        createCompany, updateCompany,
        createPlan, updatePlan,
        createSubscription, updateSubscription,
        createAdminUser, updateAdminUser,
        createSupportGrant, revokeSupportGrant,
      ],
      (state) => {
        state.loadedAt = null;
      },
    );
  },
});

export default slice.reducer;
