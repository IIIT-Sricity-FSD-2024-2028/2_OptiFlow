import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { addListCases, addMutationCases, idleMutation, invalidateLists, listState } from "../core/keyedList";
import { fetchSupportGrants, createSupportGrant, revokeSupportGrant } from "./thunks";

// state.platformSupportAccess: lists (one cached page per query), order,
// mutations { create, revoke }
export const initialState = () => ({
  ...baseState(),
  ...listState(),
  mutations: { create: idleMutation(), revoke: idleMutation() },
});

const slice = createSlice({
  name: "platformSupportAccess",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchSupportGrants);
    addMutationCases(builder, createSupportGrant, "create", invalidateLists);
    addMutationCases(builder, revokeSupportGrant, "revoke", invalidateLists);
  },
});

export default slice.reducer;
