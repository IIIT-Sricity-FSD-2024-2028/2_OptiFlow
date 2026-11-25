import { createApiThunk } from "../core/createApiThunk";
import { createListThunks } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";

// Call through the namespace so tests can spy on it.
// fetchRoleAssignments({ userId?, roleId?, force? }): pass a filter only when it is set.
// There is no get-by-id or update route: changing a role is remove + create.
const { fetchList } = createListThunks("roleAssignments", {
  list: (query, options) => roleAssignmentsApi.list(query ?? {}, options),
});
export const fetchRoleAssignments = fetchList;

// Keys in state.roleAssignments.mutations.
export const CREATE_KEY = "create";
export const removeKey = (id) => `remove:${id}`;

const { selectWriteStatus } = makeWriteSelectors("roleAssignments");

// After a write succeeds the list is stale: dispatch fetchRoleAssignments() to reload it.
// createRoleAssignment({ userId, roleId, scopeType, scopeId })
export const createRoleAssignment = createApiThunk("roleAssignments/create", (data, options) =>
  roleAssignmentsApi.create(data, options),
);

// removeRoleAssignment(id): skipped while that id is already being removed.
export const removeRoleAssignment = createApiThunk(
  "roleAssignments/remove",
  (id, options) => roleAssignmentsApi.remove(id, options),
  { condition: (id, { getState }) => selectWriteStatus(getState(), removeKey(id)) !== "loading" },
);
