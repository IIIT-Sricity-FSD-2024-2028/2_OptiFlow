import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { fetchRoles, fetchRoleById } from "./thunks";

export const rolesAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "roles",
  initialState: createListState(rolesAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchRoles, rolesAdapter);
    addDetailCases(builder, fetchRoleById, rolesAdapter);
  },
});

export default slice.reducer;
