import { makeListSelectors } from "../hr/listSlice";

// Pages read users only through these.
const s = makeListSelectors("users");

export const selectAllUsers = s.selectAll;
export const selectUserById = s.selectById;
export const selectUsersStatus = s.selectStatus;
export const selectUsersError = s.selectError;
export const selectUsersLoadedAt = s.selectLoadedAt;
export const selectUserDetailStatus = s.selectDetailStatus;
export const selectUserDetailError = s.selectDetailError;
