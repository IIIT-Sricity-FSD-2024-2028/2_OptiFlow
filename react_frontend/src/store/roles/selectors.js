import { makeListSelectors } from "../hr/listSlice";

// Pages read roles only through these.
const s = makeListSelectors("roles");

export const selectAllRoles = s.selectAll;
export const selectRoleById = s.selectById;
export const selectRolesStatus = s.selectStatus;
export const selectRolesError = s.selectError;
export const selectRolesLoadedAt = s.selectLoadedAt;
export const selectRoleDetailStatus = s.selectDetailStatus;
export const selectRoleDetailError = s.selectDetailError;
