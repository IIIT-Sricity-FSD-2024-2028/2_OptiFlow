import { createListThunks } from "../hr/listSlice";
import * as branchesApi from "../../services/api/branches";

// Reads only (mutations come in a later PR). Call through the namespace so tests can spy on it.
// fetchBranches({ branchId? , force? }): pass branchId only when set ({ branchId: undefined } is a different cache key).
// fetchBranchById(id): always reloads unless that id is already loading.
// After a write, use fetchBranches({ force: true }): a loaded list counts as fresh for 60 s.
const { fetchList, fetchById } = createListThunks("branches", {
  list: (query, options) => branchesApi.list(query ?? {}, options),
  get: (id, options) => branchesApi.get(id, options),
});

export const fetchBranches = fetchList;
export const fetchBranchById = fetchById;
