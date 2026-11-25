import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases } from "../hr/listSlice";
import { addWriteCases, invalidateList } from "../hr/writeCases";
import { fetchRoleAssignments, createRoleAssignment, removeRoleAssignment, CREATE_KEY, removeKey } from "./thunks";

const roleAssignmentsAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded user and role included).
const slice = createSlice({
  name: "roleAssignments",
  initialState: createListState(roleAssignmentsAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchRoleAssignments, roleAssignmentsAdapter);
    // One write can change other rows on the server (granting Branch Manager revokes the previous
    // one; a revoke also removes identical duplicates), so the list is reloaded, not patched.
    addWriteCases(builder, createRoleAssignment, () => CREATE_KEY, invalidateList);
    addWriteCases(builder, removeRoleAssignment, removeKey, (state, action) => {
      const id = action.meta.arg;
      roleAssignmentsAdapter.removeOne(state, id);
      state.listIds = state.listIds.filter((rowId) => rowId !== id);
      invalidateList(state);
    });
  },
});

export default slice.reducer;
