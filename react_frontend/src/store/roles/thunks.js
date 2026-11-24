import { createListThunks } from "../hr/listSlice";
import * as rolesApi from "../../services/api/roles";

// Reads only (mutations come in a later PR). Call through the namespace so tests can spy on it.
// fetchRoles({ force? }): the endpoint takes no filters, so the query is never sent.
// fetchRoleById(id): always reloads unless that id is already loading.
// After a write, use fetchRoles({ force: true }): a loaded list counts as fresh for 60 s.
const { fetchList, fetchById } = createListThunks("roles", {
  list: (_query, options) => rolesApi.list(options),
  get: (id, options) => rolesApi.get(id, options),
});

export const fetchRoles = fetchList;
export const fetchRoleById = fetchById;
