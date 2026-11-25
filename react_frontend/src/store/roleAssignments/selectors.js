import { makeListSelectors } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";
import { roleAssignmentWriteKeys } from "./thunks";

// Pages read role assignments only through these.
const s = makeListSelectors("roleAssignments");
const w = makeWriteSelectors("roleAssignments");

export const selectAllRoleAssignments = s.selectAll;
export const selectRoleAssignmentById = s.selectById;
export const selectRoleAssignmentsStatus = s.selectStatus;
export const selectRoleAssignmentsError = s.selectError;
export const selectRoleAssignmentsLoadedAt = s.selectLoadedAt;

export const selectCreateRoleAssignmentStatus = (state) => w.selectWriteStatus(state, roleAssignmentWriteKeys.create());
export const selectCreateRoleAssignmentError = (state) => w.selectWriteError(state, roleAssignmentWriteKeys.create());
export const selectRemoveRoleAssignmentStatus = (state, id) => w.selectWriteStatus(state, roleAssignmentWriteKeys.remove(id));
export const selectRemoveRoleAssignmentError = (state, id) => w.selectWriteError(state, roleAssignmentWriteKeys.remove(id));
