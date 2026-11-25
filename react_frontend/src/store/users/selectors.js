import { makeListSelectors } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";

// Pages read users only through these.
const s = makeListSelectors("users");

export const selectAllUsers = s.selectAll;
export const selectUserById = s.selectById;
export const selectUsersStatus = s.selectStatus;
export const selectUsersError = s.selectError;
export const selectUsersLoadedAt = s.selectLoadedAt;
export const selectUserDetailStatus = s.selectDetailStatus;
export const selectUserDetailError = s.selectDetailError;

const w = makeWriteSelectors("users");

// (state, key), key from userWriteKeys.
export const selectUserWriteStatus = w.selectWriteStatus;
export const selectUserWriteError = w.selectWriteError;
