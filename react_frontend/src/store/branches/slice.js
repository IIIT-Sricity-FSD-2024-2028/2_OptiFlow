import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { addWriteCases, addStaleAfterWrites, clearWriteStatus, dropRow } from "../hr/writeCases";
import {
  fetchBranches, fetchBranchById,
  createBranch, updateBranch, removeBranch,
  branchWriteKeys,
} from "./thunks";

export const branchesAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "branches",
  initialState: createListState(branchesAdapter),
  reducers: { clearBranchWriteStatus: clearWriteStatus },
  extraReducers: (builder) => {
    addListCases(builder, fetchBranches, branchesAdapter);
    addDetailCases(builder, fetchBranchById, branchesAdapter);
    addWriteCases(builder, createBranch, branchWriteKeys.create);
    addWriteCases(builder, updateBranch, ({ id }) => branchWriteKeys.update(id));
    addWriteCases(builder, removeBranch, ({ id }) => branchWriteKeys.remove(id), dropRow(branchesAdapter, (arg) => arg.id));
    addStaleAfterWrites(builder);
  },
});

// clearBranchWriteStatus(key): dispatch when a form opens, so it never shows an earlier result.
export const { clearBranchWriteStatus } = slice.actions;
export default slice.reducer;
