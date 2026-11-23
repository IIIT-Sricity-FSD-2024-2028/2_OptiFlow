import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { fetchBranches, fetchBranchById } from "./thunks";

export const branchesAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "branches",
  initialState: createListState(branchesAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchBranches, branchesAdapter);
    addDetailCases(builder, fetchBranchById, branchesAdapter);
  },
});

export default slice.reducer;
