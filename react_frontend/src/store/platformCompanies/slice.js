import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { isAbortedRejection } from "../core/createApiThunk";
import { normalizeError } from "../core/normalizeError";
import {
  addInvalidateOn,
  addListCases,
  addMutationCases,
  idleMutation,
  invalidateLists,
  listState,
} from "../core/keyedList";
import { fetchCompanies, fetchCompany, createCompany, updateCompany } from "./thunks";
import { createSubscription, updateSubscription } from "../platformSubscriptions/thunks";
import { createSupportGrant, revokeSupportGrant } from "../platformSupportAccess/thunks";
import { createPlan, updatePlan } from "../platformPlans/thunks";

// state.platformCompanies
// ├─ lists       one cached page per query (see core/keyedList)
// ├─ order       query keys, oldest first
// ├─ details     { [companyId]: { status, error, data, loadedAt, requestId } }
// └─ mutations   create { status, error }, update { status, error }

const emptyDetail = () => ({ status: "idle", error: null, data: null, loadedAt: null, requestId: null });

export const initialState = () => ({
  ...baseState(),
  ...listState(),
  details: {},
  mutations: { create: idleMutation(), update: idleMutation() },
});

// Something changed the companies (or what a company row or page shows): every cached list and
// detail is stale, so the next read of it fetches again.
const invalidateAll = (state) => {
  invalidateLists(state);
  for (const detail of Object.values(state.details)) detail.loadedAt = null;
};

const slice = createSlice({
  name: "platformCompanies",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchCompanies);

    builder
      .addCase(fetchCompany.pending, (state, action) => {
        const { id } = action.meta.arg;
        if (!state.details[id]) state.details[id] = emptyDetail();
        const detail = state.details[id];
        detail.status = "loading";
        detail.error = null;
        detail.requestId = action.meta.requestId;
      })
      .addCase(fetchCompany.fulfilled, (state, action) => {
        const detail = state.details[action.meta.arg.id];
        if (!detail || detail.requestId !== action.meta.requestId) return;
        detail.data = action.payload ?? null;
        detail.status = "succeeded";
        detail.loadedAt = Date.now();
        detail.requestId = null;
      })
      .addCase(fetchCompany.rejected, (state, action) => {
        const detail = state.details[action.meta.arg.id];
        if (!detail || detail.requestId !== action.meta.requestId) return;
        detail.requestId = null;
        if (isAbortedRejection(action)) {
          detail.status = detail.loadedAt ? "succeeded" : "idle";
          detail.error = null;
          return;
        }
        detail.status = "failed";
        detail.error = action.payload ?? normalizeError(action.error);
      });

    addMutationCases(builder, createCompany, "create", invalidateAll);
    addMutationCases(builder, updateCompany, "update", invalidateAll);

    // Writes made through other slices that change what a company shows.
    addInvalidateOn(
      builder,
      [createSubscription, updateSubscription, createSupportGrant, revokeSupportGrant, createPlan, updatePlan],
      invalidateAll,
    );
  },
});

export default slice.reducer;
