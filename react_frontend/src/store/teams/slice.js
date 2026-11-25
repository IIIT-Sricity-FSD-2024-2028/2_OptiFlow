import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { createListState, addListCases, addDetailCases } from "../hr/listSlice";
import { addWriteCases, addStaleAfterWrites, clearWriteStatus, dropRow } from "../hr/writeCases";
import {
  fetchTeams, fetchTeamById,
  createTeam, updateTeam, removeTeam, addTeamMember, updateTeamMemberRole, removeTeamMember,
  teamWriteKeys,
} from "./thunks";

export const teamsAdapter = createEntityAdapter();

// Rows are stored exactly as the server returns them (embedded data included).
const slice = createSlice({
  name: "teams",
  initialState: createListState(teamsAdapter),
  reducers: { clearTeamWriteStatus: clearWriteStatus },
  extraReducers: (builder) => {
    addListCases(builder, fetchTeams, teamsAdapter);
    addDetailCases(builder, fetchTeamById, teamsAdapter);
    addWriteCases(builder, createTeam, teamWriteKeys.create);
    addWriteCases(builder, updateTeam, ({ id }) => teamWriteKeys.update(id));
    addWriteCases(builder, removeTeam, teamWriteKeys.remove, dropRow(teamsAdapter));
    addWriteCases(builder, addTeamMember, ({ teamId, userId }) => teamWriteKeys.addMember(teamId, userId));
    addWriteCases(builder, updateTeamMemberRole, ({ teamId, userId }) => teamWriteKeys.memberRole(teamId, userId));
    addWriteCases(builder, removeTeamMember, ({ teamId, userId }) => teamWriteKeys.removeMember(teamId, userId));
    addStaleAfterWrites(builder);
  },
});

// clearTeamWriteStatus(key): dispatch when a form opens, so it never shows an earlier result.
export const { clearTeamWriteStatus } = slice.actions;
export default slice.reducer;
