import { createApiThunk } from "../core/createApiThunk";
import { createListThunk } from "../core/keyedList";
import { queryKeyOf, shouldFetch } from "../core/shouldFetch";
import * as platformApi from "../../services/api/platform";

// List: fetchCompanies({ page, pageSize, q, status }) is skipped while the same query is loading
// or fresh; add `force: true` to always fetch. The wrapper is looked up at call time, not here.
export const fetchCompanies = createListThunk("platformCompanies", (query, options) =>
  platformApi.listCompanies(query, options),
);

// One company with its subscriptions, users, branches and recent support grants.
// fetchCompany({ id }) or fetchCompany({ id, force: true }).
export const fetchCompany = createApiThunk(
  "platformCompanies/fetchById",
  ({ id }, options) => platformApi.getCompany(id, options),
  {
    abortable: true,
    condition: (arg, { getState }) => {
      if (!arg || typeof arg.id !== "string" || arg.id === "") return false;
      const entry = getState().platformCompanies.details[arg.id];
      if (!entry) return true;
      return shouldFetch(
        { status: entry.status, queryKey: queryKeyOf(arg), loadedAt: entry.loadedAt },
        arg,
      );
    },
  },
);

// Provision a company. The answer carries the one-time set-password link; it goes to the caller
// (unwrap) and is never kept in the store.
export const createCompany = createApiThunk("platformCompanies/create", (body, options) =>
  platformApi.createCompany(body, options),
);

// updateCompany({ id, body }): status changes (Suspend, Close, Reactivate) and legal name.
export const updateCompany = createApiThunk(
  "platformCompanies/update",
  ({ id, body }, options) => platformApi.updateCompany(id, body, options),
);
