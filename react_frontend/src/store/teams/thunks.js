import { createListThunks } from "../hr/listSlice";
import { createWriteThunk } from "../hr/writeCases";
import * as teamsApi from "../../services/api/teams";

// Call through the namespace so tests can spy on it.
// fetchTeams({ branchId? , force? }): pass branchId only when set ({ branchId: undefined } is a different cache key).
// fetchTeamById(id): always reloads unless that id is already loading.
// A loaded list counts as fresh for 60 s. An HR write makes every HR list stale, so a
// plain fetch after it reloads.
const { fetchList, fetchById } = createListThunks("teams", {
  list: (query, options) => teamsApi.list(query ?? {}, options),
  get: (id, options) => teamsApi.get(id, options),
});

export const fetchTeams = fetchList;
export const fetchTeamById = fetchById;

// Keys in state.teams.mutations, for selectTeamWriteStatus / selectTeamWriteError.
export const teamWriteKeys = {
  create: () => "create",
  update: (id) => `update:${id}`,
  remove: (id) => `remove:${id}`,
  addMember: (teamId, userId) => `addMember:${teamId}:${userId}`,
  memberRole: (teamId, userId) => `memberRole:${teamId}:${userId}`,
  removeMember: (teamId, userId) => `removeMember:${teamId}:${userId}`,
};

// createTeam(data)
export const createTeam = createWriteThunk(
  "teams", "create",
  (data, options) => teamsApi.create(data, options),
  teamWriteKeys.create,
);

// updateTeam({ id, data })
export const updateTeam = createWriteThunk(
  "teams", "update",
  ({ id, data }, options) => teamsApi.update(id, data, options),
  ({ id }) => teamWriteKeys.update(id),
);

// removeTeam(id)
export const removeTeam = createWriteThunk(
  "teams", "remove",
  (id, options) => teamsApi.remove(id, options),
  teamWriteKeys.remove,
);

// addTeamMember({ teamId, userId, role })
export const addTeamMember = createWriteThunk(
  "teams", "addMember",
  ({ teamId, ...data }, options) => teamsApi.addMember(teamId, data, options),
  ({ teamId, userId }) => teamWriteKeys.addMember(teamId, userId),
);

// updateTeamMemberRole({ teamId, userId, role })
export const updateTeamMemberRole = createWriteThunk(
  "teams", "updateMemberRole",
  ({ teamId, userId, role }, options) => teamsApi.updateMemberRole(teamId, userId, role, options),
  ({ teamId, userId }) => teamWriteKeys.memberRole(teamId, userId),
);

// removeTeamMember({ teamId, userId })
export const removeTeamMember = createWriteThunk(
  "teams", "removeMember",
  ({ teamId, userId }, options) => teamsApi.removeMember(teamId, userId, options),
  ({ teamId, userId }) => teamWriteKeys.removeMember(teamId, userId),
);
