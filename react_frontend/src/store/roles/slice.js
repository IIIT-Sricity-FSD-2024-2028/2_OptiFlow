import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { addWriteCases, addStaleAfterWrites, clearWriteStatus, dropRow } from "../hr/writeCases";
import {
  fetchRoles, fetchRoleById,
  createRole, updateRole, setRolePermissions, removeRole,
  roleWriteKeys,
} from "./thunks";

export const rolesAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "roles",
  initialState: createListState(rolesAdapter),
  reducers: { clearRoleWriteStatus: clearWriteStatus },
  extraReducers: (builder) => {
    addListCases(builder, fetchRoles, rolesAdapter);
    addDetailCases(builder, fetchRoleById, rolesAdapter);
    addWriteCases(builder, createRole, roleWriteKeys.create);
    addWriteCases(builder, updateRole, ({ id }) => roleWriteKeys.update(id));
    addWriteCases(builder, setRolePermissions, ({ id }) => roleWriteKeys.permissions(id));
    addWriteCases(builder, removeRole, roleWriteKeys.remove, dropRow(rolesAdapter));
    addStaleAfterWrites(builder);
  },
});

// clearRoleWriteStatus(key): dispatch when a form opens, so it never shows an earlier result.
export const { clearRoleWriteStatus } = slice.actions;
export default slice.reducer;
