import { createApiThunk } from "../core/createApiThunk";
import { createListThunk } from "../core/keyedList";
import * as platformApi from "../../services/api/platform";

// fetchSubscriptions({ page, pageSize, q, status, planId, billingCycle, pastDue, expiringWithin,
// companyId }); `force: true` always fetches.
export const fetchSubscriptions = createListThunk("platformSubscriptions", (query, options) =>
  platformApi.listSubscriptions(query, options),
);

export const createSubscription = createApiThunk("platformSubscriptions/create", (body, options) =>
  platformApi.createSubscription(body, options),
);

// updateSubscription({ id, body }): plan, billing cycle, status and period end changes.
export const updateSubscription = createApiThunk(
  "platformSubscriptions/update",
  ({ id, body }, options) => platformApi.updateSubscription(id, body, options),
);
