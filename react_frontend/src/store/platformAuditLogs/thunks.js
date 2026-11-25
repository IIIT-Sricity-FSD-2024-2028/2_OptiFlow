import { createListThunk } from "../core/keyedList";
import * as platformApi from "../../services/api/platform";

// Read-only slice. fetchAuditLogs({ page, pageSize, q, action, entityType, entityId, adminUserId,
// companyId, startDate, endDate }); `force: true` always fetches.
export const fetchAuditLogs = createListThunk("platformAuditLogs", (query, options) =>
  platformApi.listAuditLogs(query, options),
);
