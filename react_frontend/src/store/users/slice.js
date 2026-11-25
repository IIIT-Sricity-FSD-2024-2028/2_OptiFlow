import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { addWriteCases, addStaleAfterWrites, clearWriteStatus } from "../hr/writeCases";
import {
  fetchUsers, fetchUserById,
  createUser, updateUser, deactivateUser, reactivateUser,
  userWriteKeys,
} from "./thunks";

export const usersAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "users",
  initialState: createListState(usersAdapter),
  reducers: { clearUserWriteStatus: clearWriteStatus },
  extraReducers: (builder) => {
    addListCases(builder, fetchUsers, usersAdapter);
    addDetailCases(builder, fetchUserById, usersAdapter);
    addWriteCases(builder, createUser, userWriteKeys.create);
    addWriteCases(builder, updateUser, ({ id }) => userWriteKeys.user(id));
    addWriteCases(builder, deactivateUser, userWriteKeys.user);
    addWriteCases(builder, reactivateUser, userWriteKeys.user);
    addStaleAfterWrites(builder);
  },
});

// clearUserWriteStatus(key): dispatch when a form opens, so it never shows an earlier result.
export const { clearUserWriteStatus } = slice.actions;
export default slice.reducer;
