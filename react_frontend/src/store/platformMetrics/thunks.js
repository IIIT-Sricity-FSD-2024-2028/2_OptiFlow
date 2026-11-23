import { createApiThunk } from "../core/createApiThunk";
import { shouldFetch } from "../core/shouldFetch";
import * as platformApi from "../../services/api/platform";

// A read: abortable, and skipped while the same query is loading or still fresh.
// fetchPlatformMetrics()                 -> normal (uses fresh data when there is some)
// fetchPlatformMetrics({ force: true })  -> always fetches (Refresh button)
export const fetchPlatformMetrics = createApiThunk(
  "platformMetrics/fetch",
  (_arg, options) => platformApi.getMetrics(options),
  {
    abortable: true,
    condition: (arg, { getState }) => shouldFetch(getState().platformMetrics, arg),
  },
);
