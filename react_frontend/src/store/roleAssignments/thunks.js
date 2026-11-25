import { createListThunks } from "../hr/listSlice";
import { createWriteThunk } from "../hr/writeCases";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";

// Call through the namespace so tests can spy on it.
// fetchRoleAssignments({ userId?, roleId?, force? }): pass a filter only when it is set.
// There is no get-by-id or update route: changing a role is remove + create.
const { fetchList } = createListThunks("roleAssignments", {
  list: (query, options) => roleAssignmentsApi.list(query ?? {}, options),
});
export const fetchRoleAssignments = fetchList;

// Keys in state.roleAssignments.mutations.
export const roleAssignmentWriteKeys = {
  create: () => "create",
  remove: (id) => `remove:${id}`,
};

// After a write every HR list is stale: dispatch the fetches the page shows.
// createRoleAssignment({ userId, roleId, scopeType, scopeId })
export const createRoleAssignment = createWriteThunk(
  "roleAssignments", "create",
  (data, options) => roleAssignmentsApi.create(data, options),
  roleAssignmentWriteKeys.create,
);

// removeRoleAssignment(id)
export const removeRoleAssignment = createWriteThunk(
  "roleAssignments", "remove",
  (id, options) => roleAssignmentsApi.remove(id, options),
  roleAssignmentWriteKeys.remove,
);
