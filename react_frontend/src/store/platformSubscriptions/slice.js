import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  addInvalidateOn,
  addListCases,
  addMutationCases,
  idleMutation,
  invalidateLists,
  listState,
} from "../core/keyedList";
import { fetchSubscriptions, createSubscription, updateSubscription } from "./thunks";
import { createCompany, updateCompany } from "../platformCompanies/thunks";
import { createPlan, updatePlan } from "../platformPlans/thunks";

// state.platformSubscriptions: lists (one cached page per query), order, mutations { create, update }
export const initialState = () => ({
  ...baseState(),
  ...listState(),
  mutations: { create: idleMutation(), update: idleMutation() },
});

const slice = createSlice({
  name: "platformSubscriptions",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchSubscriptions);
    addMutationCases(builder, createSubscription, "create", invalidateLists);
    addMutationCases(builder, updateSubscription, "update", invalidateLists);

    // Provisioning a company creates its subscription; renaming a plan or changing a company
    // changes what the rows show.
    addInvalidateOn(builder, [createCompany, updateCompany, createPlan, updatePlan]);
  },
});

export default slice.reducer;
