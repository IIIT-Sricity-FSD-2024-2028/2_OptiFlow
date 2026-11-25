import { createApiThunk } from "../core/createApiThunk";
import { createListThunk } from "../core/keyedList";
import * as platformApi from "../../services/api/platform";

// fetchAdminUsers({ page, pageSize, q, status }); `force: true` always fetches.
export const fetchAdminUsers = createListThunk("platformAdminUsers", (query, options) =>
  platformApi.listAdminUsers(query, options),
);

// The answers of create and reset carry a temporary password. They go to the caller (unwrap)
// and are never kept in the store.
export const createAdminUser = createApiThunk("platformAdminUsers/create", (body, options) =>
  platformApi.createAdminUser(body, options),
);

export const updateAdminUser = createApiThunk(
  "platformAdminUsers/update",
  ({ id, body }, options) => platformApi.updateAdminUser(id, body, options),
);

export const resetAdminPassword = createApiThunk("platformAdminUsers/resetPassword", (id, options) =>
  platformApi.resetAdminPassword(id, options),
);
