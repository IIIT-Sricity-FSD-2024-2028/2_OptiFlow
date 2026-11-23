import { createListThunks } from "../hr/listSlice";
import * as teamsApi from "../../services/api/teams";

// Reads only (mutations come in a later PR). Call through the namespace so tests can spy on it.
// fetchTeams({ branchId? , force? }): pass branchId only when set ({ branchId: undefined } is a different cache key).
// fetchTeamById(id): always reloads unless that id is already loading.
// After a write, use fetchTeams({ force: true }): a loaded list counts as fresh for 60 s.
const { fetchList, fetchById } = createListThunks("teams", {
  list: (query, options) => teamsApi.list(query ?? {}, options),
  get: (id, options) => teamsApi.get(id, options),
});

export const fetchTeams = fetchList;
export const fetchTeamById = fetchById;
