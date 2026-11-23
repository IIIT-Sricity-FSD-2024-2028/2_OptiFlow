import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { fetchTeams, fetchTeamById } from "./thunks";

export const teamsAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "teams",
  initialState: createListState(teamsAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchTeams, teamsAdapter);
    addDetailCases(builder, fetchTeamById, teamsAdapter);
  },
});

export default slice.reducer;
