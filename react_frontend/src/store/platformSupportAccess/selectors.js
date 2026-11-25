import { makeListSelectors } from "../core/keyedList";

const { selectEntry, selectMutation } = makeListSelectors("platformSupportAccess");

// Pages read the store only through these.
export const selectSupportGrantsEntry = selectEntry;
export const selectSupportGrantMutation = selectMutation;
