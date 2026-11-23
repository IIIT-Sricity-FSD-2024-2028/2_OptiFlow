import { FRESHNESS_WINDOW_MS, isFresh } from "./freshness";

// The "query" of a read is its argument, minus `force` (a flag, not part of what is fetched).
// Same query => same key, so the cache can tell "this data answers this request".
export function queryKeyOf(arg) {
  if (arg && typeof arg === "object" && !Array.isArray(arg)) {
    const { force, ...query } = arg; // eslint-disable-line no-unused-vars
    const keys = Object.keys(query).sort(); // {a,b} and {b,a} are the same query
    if (keys.length === 0) return "null"; // no arguments, undefined and {} are the same query
    return JSON.stringify(Object.fromEntries(keys.map((k) => [k, query[k]])));
  }
  return JSON.stringify(arg ?? null);
}

/**
 * The `condition` for a read thunk. `slice` is the slice state, which must hold
 * `status`, `queryKey` and `loadedAt`.
 *  - the same query is already loading     -> skip (share the running request)
 *  - `force: true`                         -> fetch (the Refresh button)
 *  - same query loaded less than 60 s ago  -> skip (data is fresh)
 *  - anything else (new query, stale, none) -> fetch
 */
export function shouldFetch(slice, arg, { windowMs = FRESHNESS_WINDOW_MS, now = Date.now() } = {}) {
  const key = queryKeyOf(arg);
  if (slice.status === "loading" && slice.queryKey === key) return false;
  if (arg && typeof arg === "object" && arg.force) return true;
  return !(slice.queryKey === key && isFresh(slice.loadedAt, windowMs, now));
}
