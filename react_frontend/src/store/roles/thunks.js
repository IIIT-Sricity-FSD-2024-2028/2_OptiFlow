import { createListThunks } from "../hr/listSlice";
import { createWriteThunk } from "../hr/writeCases";
import * as rolesApi from "../../services/api/roles";

// Call through the namespace so tests can spy on it.
// fetchRoles({ force? }): the endpoint takes no filters, so the query is never sent.
// fetchRoleById(id): always reloads unless that id is already loading.
// A loaded list counts as fresh for 60 s. An HR write makes every HR list stale, so a
// plain fetch after it reloads.
const { fetchList, fetchById } = createListThunks("roles", {
  list: (_query, options) => rolesApi.list(options),
  get: (id, options) => rolesApi.get(id, options),
});

export const fetchRoles = fetchList;
export const fetchRoleById = fetchById;

// Keys in state.roles.mutations, for selectRoleWriteStatus / selectRoleWriteError.
export const roleWriteKeys = {
  create: () => "create",
  update: (id) => `update:${id}`,
  permissions: (id) => `permissions:${id}`,
  remove: (id) => `remove:${id}`,
};

// createRole(data)
export const createRole = createWriteThunk(
  "roles", "create",
  (data, options) => rolesApi.create(data, options),
  roleWriteKeys.create,
);

// updateRole({ id, data })
export const updateRole = createWriteThunk(
  "roles", "update",
  ({ id, data }, options) => rolesApi.update(id, data, options),
  ({ id }) => roleWriteKeys.update(id),
);

// setRolePermissions({ id, permissionSlugs }): replaces the whole set.
export const setRolePermissions = createWriteThunk(
  "roles", "setPermissions",
  ({ id, permissionSlugs }, options) => rolesApi.setPermissions(id, permissionSlugs, options),
  ({ id }) => roleWriteKeys.permissions(id),
);

// removeRole(id)
export const removeRole = createWriteThunk(
  "roles", "remove",
  (id, options) => rolesApi.remove(id, options),
  roleWriteKeys.remove,
);
