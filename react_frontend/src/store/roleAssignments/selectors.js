import { makeListSelectors } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";
import { CREATE_KEY, removeKey } from "./thunks";

// Pages read role assignments only through these.
const s = makeListSelectors("roleAssignments");
const w = makeWriteSelectors("roleAssignments");

export const selectAllRoleAssignments = s.selectAll;
export const selectRoleAssignmentById = s.selectById;
export const selectRoleAssignmentsStatus = s.selectStatus;
export const selectRoleAssignmentsError = s.selectError;
export const selectRoleAssignmentsLoadedAt = s.selectLoadedAt;

export const selectCreateRoleAssignmentStatus = (state) => w.selectWriteStatus(state, CREATE_KEY);
export const selectCreateRoleAssignmentError = (state) => w.selectWriteError(state, CREATE_KEY);
export const selectRemoveRoleAssignmentStatus = (state, id) => w.selectWriteStatus(state, removeKey(id));
export const selectRemoveRoleAssignmentError = (state, id) => w.selectWriteError(state, removeKey(id));
