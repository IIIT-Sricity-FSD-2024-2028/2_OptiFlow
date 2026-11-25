import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases } from "../hr/listSlice";
import { addWriteCases, addStaleAfterWrites, clearWriteStatus, dropRow } from "../hr/writeCases";
import { fetchRoleAssignments, createRoleAssignment, removeRoleAssignment, roleAssignmentWriteKeys } from "./thunks";

const roleAssignmentsAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded user and role included).
const slice = createSlice({
  name: "roleAssignments",
  initialState: createListState(roleAssignmentsAdapter),
  reducers: { clearRoleAssignmentWriteStatus: clearWriteStatus },
  extraReducers: (builder) => {
    addListCases(builder, fetchRoleAssignments, roleAssignmentsAdapter);
    // One write can change other rows on the server (granting Branch Manager revokes the previous
    // one; a revoke also removes identical duplicates), so the list is reloaded, not patched.
    addWriteCases(builder, createRoleAssignment, roleAssignmentWriteKeys.create);
    addWriteCases(builder, removeRoleAssignment, roleAssignmentWriteKeys.remove, dropRow(roleAssignmentsAdapter));
    addStaleAfterWrites(builder);
  },
});

// clearRoleAssignmentWriteStatus(key): dispatch when a form opens, so it never shows an earlier result.
export const { clearRoleAssignmentWriteStatus } = slice.actions;
export default slice.reducer;
