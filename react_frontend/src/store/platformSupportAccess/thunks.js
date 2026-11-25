import { createApiThunk } from "../core/createApiThunk";
import { createListThunk } from "../core/keyedList";
import * as platformApi from "../../services/api/platform";

// fetchSupportGrants({ page, pageSize, q, status, companyId, adminUserId, startDate, endDate });
// `force: true` always fetches.
export const fetchSupportGrants = createListThunk("platformSupportAccess", (query, options) =>
  platformApi.listSupportAccess(query, options),
);

// createSupportGrant({ companyId, reason, durationHours })
export const createSupportGrant = createApiThunk("platformSupportAccess/create", (body, options) =>
  platformApi.createSupportGrant(body, options),
);

// revokeSupportGrant(id)
export const revokeSupportGrant = createApiThunk("platformSupportAccess/revoke", (id, options) =>
  platformApi.revokeSupportGrant(id, options),
);
