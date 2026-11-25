import { createListThunks } from "../hr/listSlice";
import { createWriteThunk } from "../hr/writeCases";
import * as branchesApi from "../../services/api/branches";

// Call through the namespace so tests can spy on it.
// fetchBranches({ branchId? , force? }): pass branchId only when set ({ branchId: undefined } is a different cache key).
// fetchBranchById(id): always reloads unless that id is already loading.
// A loaded list counts as fresh for 60 s. An HR write makes every HR list stale, so a
// plain fetch after it reloads.
const { fetchList, fetchById } = createListThunks("branches", {
  list: (query, options) => branchesApi.list(query ?? {}, options),
  get: (id, options) => branchesApi.get(id, options),
});

export const fetchBranches = fetchList;
export const fetchBranchById = fetchById;

// Keys in state.branches.mutations, for selectBranchWriteStatus / selectBranchWriteError.
export const branchWriteKeys = {
  create: () => "create",
  update: (id) => `update:${id}`,
  remove: (id) => `remove:${id}`,
};

// createBranch(data)
export const createBranch = createWriteThunk(
  "branches", "create",
  (data, options) => branchesApi.create(data, options),
  branchWriteKeys.create,
);

// updateBranch({ id, data })
export const updateBranch = createWriteThunk(
  "branches", "update",
  ({ id, data }, options) => branchesApi.update(id, data, options),
  ({ id }) => branchWriteKeys.update(id),
);

// removeBranch({ id, reassignBranchId? })
export const removeBranch = createWriteThunk(
  "branches", "remove",
  ({ id, ...params }, options) => branchesApi.remove(id, params, options),
  ({ id }) => branchWriteKeys.remove(id),
);
