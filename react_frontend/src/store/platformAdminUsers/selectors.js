import { makeListSelectors } from "../core/keyedList";

const { selectEntry, selectMutation } = makeListSelectors("platformAdminUsers");

// Pages read the store only through these.
export const selectAdminUsersEntry = selectEntry;
export const selectAdminUserMutation = selectMutation;
