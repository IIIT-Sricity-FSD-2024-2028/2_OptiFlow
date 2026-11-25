import { makeListSelectors } from "../core/keyedList";

const { selectEntry } = makeListSelectors("platformAuditLogs");

// Pages read the store only through this.
export const selectAuditLogsEntry = selectEntry;
