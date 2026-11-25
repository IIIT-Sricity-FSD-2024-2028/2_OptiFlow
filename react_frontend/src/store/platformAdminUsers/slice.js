import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { addListCases, addMutationCases, idleMutation, invalidateLists, listState } from "../core/keyedList";
import { fetchAdminUsers, createAdminUser, updateAdminUser, resetAdminPassword } from "./thunks";

// state.platformAdminUsers: lists (one cached page per query), order,
// mutations { create, update, resetPassword }
export const initialState = () => ({
  ...baseState(),
  ...listState(),
  mutations: { create: idleMutation(), update: idleMutation(), resetPassword: idleMutation() },
});

const slice = createSlice({
  name: "platformAdminUsers",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchAdminUsers);
    addMutationCases(builder, createAdminUser, "create", invalidateLists);
    addMutationCases(builder, updateAdminUser, "update", invalidateLists);
    addMutationCases(builder, resetAdminPassword, "resetPassword", invalidateLists);
  },
});

export default slice.reducer;
