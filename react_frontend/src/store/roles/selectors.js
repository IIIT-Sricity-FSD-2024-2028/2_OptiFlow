import { makeListSelectors } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";

// Pages read roles only through these.
const s = makeListSelectors("roles");

export const selectAllRoles = s.selectAll;
export const selectRoleById = s.selectById;
export const selectRolesStatus = s.selectStatus;
export const selectRolesError = s.selectError;
export const selectRolesLoadedAt = s.selectLoadedAt;
export const selectRoleDetailStatus = s.selectDetailStatus;
export const selectRoleDetailError = s.selectDetailError;

const w = makeWriteSelectors("roles");

// (state, key), key from roleWriteKeys.
export const selectRoleWriteStatus = w.selectWriteStatus;
export const selectRoleWriteError = w.selectWriteError;
