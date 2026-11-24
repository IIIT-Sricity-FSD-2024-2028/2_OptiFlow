import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { fetchUsers, fetchUserById } from "./thunks";

export const usersAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "users",
  initialState: createListState(usersAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchUsers, usersAdapter);
    addDetailCases(builder, fetchUserById, usersAdapter);
  },
});

export default slice.reducer;
