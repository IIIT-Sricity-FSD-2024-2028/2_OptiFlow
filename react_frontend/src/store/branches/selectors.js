import { makeListSelectors } from "../hr/listSlice";

// Pages read branches only through these.
const s = makeListSelectors("branches");

export const selectAllBranches = s.selectAll;
export const selectBranchById = s.selectById;
export const selectBranchesStatus = s.selectStatus;
export const selectBranchesError = s.selectError;
export const selectBranchesLoadedAt = s.selectLoadedAt;
export const selectBranchDetailStatus = s.selectDetailStatus;
export const selectBranchDetailError = s.selectDetailError;
